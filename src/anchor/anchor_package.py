#!/usr/bin/env python3
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def anchor_package(validation_report_path, registry_path):
    validation = load_json(validation_report_path)
    if validation.get("status") != "COMPLETE":
        raise SystemExit("Pacote nao pode ser ancorado porque a validacao nao esta COMPLETE.")

    package_path = Path(validation["package_path"])
    manifest_path = package_path / "data" / "hour_manifest.json"
    manifest = load_json(manifest_path)

    registry_path = Path(registry_path)
    if registry_path.exists():
        registry = load_json(registry_path)
    else:
        registry = {
            "schema": "cftv-custody-anchor-registry/v1",
            "anchors": [],
        }

    anchor = {
        "anchor_id": f"{manifest['camera_id']}:{manifest['capture_start']}",
        "anchored_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "camera_id": manifest["camera_id"],
        "device_id": manifest["device_id"],
        "gateway_id": manifest["gateway_id"],
        "capture_start": manifest["capture_start"],
        "capture_end": manifest["capture_end"],
        "segment_count": manifest["segment_count"],
        "package_path": validation["package_path"],
        "package_root_hash": validation["package_root_hash"],
        "status": validation["status"],
        "anchor_type": "local-json",
    }

    existing_index = None
    for index, existing in enumerate(registry["anchors"]):
        if existing.get("anchor_id") == anchor["anchor_id"]:
            existing_index = index
            break

    if existing_index is None:
        registry["anchors"].append(anchor)
    else:
        registry["anchors"][existing_index] = anchor

    write_json(registry_path, registry)
    return anchor


def main():
    parser = argparse.ArgumentParser(description="Ancora pacote validado em registro local JSON.")
    parser.add_argument("--validation-report", default="reports/gateway_validation_report.json")
    parser.add_argument("--registry", default="data/anchor/anchor_registry.json")
    parser.add_argument("--anchor-report", default="reports/anchor_report.json")
    args = parser.parse_args()

    anchor = anchor_package(args.validation_report, args.registry)
    write_json(args.anchor_report, anchor)
    print(json.dumps(anchor, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
