#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from src.gateway.validate_package import validate_package  # noqa: E402


def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def find_anchor(registry, camera_id, capture_start):
    anchor_id = f"{camera_id}:{capture_start}"
    for anchor in registry.get("anchors", []):
        if anchor.get("anchor_id") == anchor_id:
            return anchor
    return None


def verify_against_local_anchor(package_path, public_key, registry_path):
    gateway_report = validate_package(package_path, public_key)

    manifest_path = Path(package_path) / "data" / "hour_manifest.json"
    manifest = load_json(manifest_path) if manifest_path.exists() else {}

    anchor = None
    anchor_errors = []
    registry_path = Path(registry_path)
    if registry_path.exists() and manifest:
        registry = load_json(registry_path)
        anchor = find_anchor(registry, manifest.get("camera_id"), manifest.get("capture_start"))
        if anchor is None:
            anchor_errors.append("ancora local nao encontrada")
    else:
        anchor_errors.append("registro local de ancoragem ausente")

    anchor_match = False
    if anchor:
        expected = anchor.get("package_root_hash")
        actual = gateway_report.get("package_root_hash")
        anchor_match = expected == actual
        if not anchor_match:
            anchor_errors.append("package_root_hash nao corresponde a ancora local")

        if anchor.get("segment_count") != gateway_report.get("segment_count"):
            anchor_errors.append("segment_count nao corresponde a ancora local")

        if anchor.get("status") != "COMPLETE":
            anchor_errors.append("ancora local nao esta COMPLETE")

    errors = list(gateway_report.get("errors", [])) + anchor_errors
    status = "INTEGRO" if gateway_report.get("status") == "COMPLETE" and anchor_match and not errors else "INVALIDO"

    return {
        "verification_mode": "local-anchor",
        "package_path": str(package_path),
        "camera_id": manifest.get("camera_id"),
        "capture_start": manifest.get("capture_start"),
        "capture_end": manifest.get("capture_end"),
        "gateway_validation": {
            "bagit_valid": gateway_report.get("bagit_valid"),
            "payload_checksums_valid": gateway_report.get("payload_checksums_valid"),
            "tag_checksums_valid": gateway_report.get("tag_checksums_valid"),
            "signature_valid": gateway_report.get("signature_valid"),
            "sequence_valid": gateway_report.get("sequence_valid"),
            "package_root_hash": gateway_report.get("package_root_hash"),
        },
        "anchor_validation": {
            "anchor_found": anchor is not None,
            "anchor_match": anchor_match,
            "anchor": anchor,
        },
        "status": status,
        "errors": errors,
    }


def main():
    parser = argparse.ArgumentParser(description="Verificador independente do pacote CFTV.")
    parser.add_argument("--package", default="data/packages/camera-001-20260615T210000Z")
    parser.add_argument("--public-key", default="keys/device_public.pem")
    parser.add_argument("--registry", default="data/anchor/anchor_registry.json")
    parser.add_argument("--report", default="reports/integrity_report.json")
    args = parser.parse_args()

    report = verify_against_local_anchor(args.package, args.public_key, args.registry)
    write_json(args.report, report)
    print(json.dumps(report, indent=2, sort_keys=True))
    if report["status"] != "INTEGRO":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
