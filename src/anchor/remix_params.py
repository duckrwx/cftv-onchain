#!/usr/bin/env python3
import argparse
import json
import subprocess
from datetime import datetime
from pathlib import Path


def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def bytes32_from_text(value):
    script = "const { ethers } = require('ethers'); console.log(ethers.id(process.argv[1]));"
    return subprocess.check_output(["node", "-e", script, value], text=True).strip()


def bytes32_from_hex(value):
    return value if value.startswith("0x") else f"0x{value}"


def unix_seconds(value):
    return int(datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp())


def main():
    parser = argparse.ArgumentParser(description="Gera parametros para chamada anchorPackage no Remix.")
    parser.add_argument("--validation-report", default="reports/gateway_validation_report.json")
    parser.add_argument("--package-summary", default="data/packages/camera-001-20260615T210000Z/package_summary.json")
    parser.add_argument("--manifest", default="data/packages/camera-001-20260615T210000Z/data/hour_manifest.json")
    parser.add_argument("--output", default="reports/remix_anchor_params.json")
    args = parser.parse_args()

    validation = load_json(args.validation_report)
    summary = load_json(args.package_summary)
    manifest = load_json(args.manifest)

    if validation.get("status") != "COMPLETE":
        raise SystemExit("O pacote precisa estar COMPLETE para gerar parametros on-chain.")

    params = {
        "function": "anchorPackage",
        "anchorIdSource": f"{manifest['camera_id']}:{manifest['capture_start']}",
        "cameraIdSource": manifest["camera_id"],
        "parameters": {
            "anchorId": bytes32_from_text(f"{manifest['camera_id']}:{manifest['capture_start']}"),
            "cameraId": bytes32_from_text(manifest["camera_id"]),
            "captureStart": unix_seconds(manifest["capture_start"]),
            "captureEnd": unix_seconds(manifest["capture_end"]),
            "packageRoot": bytes32_from_hex(validation["package_root_hash"]),
            "manifestHash": bytes32_from_hex(summary["manifest_hash"]),
            "segmentCount": manifest["segment_count"],
            "status": 1
        },
        "statusMeaning": {
            "1": "COMPLETE"
        }
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(params, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(params, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
