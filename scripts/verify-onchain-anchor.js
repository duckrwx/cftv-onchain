const fs = require("fs");
const path = require("path");

const DEFAULT_SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8"));
}

function toUnixSeconds(value) {
  return Math.floor(new Date(value).getTime() / 1000);
}

async function main() {
  const deployment = readJson("data/anchor/sepolia-contract.json");
  const validation = readJson("reports/gateway_validation_report.json");
  const summary = readJson("data/packages/camera-001-20260615T210000Z/package_summary.json");
  const manifest = readJson("data/packages/camera-001-20260615T210000Z/data/hour_manifest.json");

  const rpcUrl = process.env.SEPOLIA_RPC_URL || DEFAULT_SEPOLIA_RPC;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = await ethers.getContractAt("CftvCustodyAnchor", deployment.address, provider);

  const anchorId = ethers.id(`${manifest.camera_id}:${manifest.capture_start}`);
  const anchor = await contract.getAnchor(anchorId);

  const expected = {
    cameraId: ethers.id(manifest.camera_id),
    captureStart: BigInt(toUnixSeconds(manifest.capture_start)),
    captureEnd: BigInt(toUnixSeconds(manifest.capture_end)),
    packageRoot: validation.package_root_hash.startsWith("0x")
      ? validation.package_root_hash
      : `0x${validation.package_root_hash}`,
    manifestHash: summary.manifest_hash.startsWith("0x")
      ? summary.manifest_hash
      : `0x${summary.manifest_hash}`,
    segmentCount: BigInt(manifest.segment_count),
    status: 1n,
  };

  const checks = {
    cameraId: anchor.cameraId === expected.cameraId,
    captureStart: anchor.captureStart === expected.captureStart,
    captureEnd: anchor.captureEnd === expected.captureEnd,
    packageRoot: anchor.packageRoot === expected.packageRoot,
    manifestHash: anchor.manifestHash === expected.manifestHash,
    segmentCount: anchor.segmentCount === expected.segmentCount,
    status: anchor.status === expected.status,
    exists: anchor.exists === true,
  };

  const ok = Object.values(checks).every(Boolean);
  const result = {
    network: "sepolia",
    contractAddress: deployment.address,
    rpcUrl,
    anchorId,
    status: ok ? "ONCHAIN_MATCH" : "ONCHAIN_MISMATCH",
    checks,
    expected: {
      cameraId: expected.cameraId,
      captureStart: Number(expected.captureStart),
      captureEnd: Number(expected.captureEnd),
      packageRoot: expected.packageRoot,
      manifestHash: expected.manifestHash,
      segmentCount: Number(expected.segmentCount),
      status: Number(expected.status),
    },
    onchain: {
      cameraId: anchor.cameraId,
      captureStart: Number(anchor.captureStart),
      captureEnd: Number(anchor.captureEnd),
      packageRoot: anchor.packageRoot,
      manifestHash: anchor.manifestHash,
      segmentCount: Number(anchor.segmentCount),
      status: Number(anchor.status),
      submitter: anchor.submitter,
      blockTimestamp: Number(anchor.blockTimestamp),
      exists: anchor.exists,
    },
  };

  const outPath = path.join(__dirname, "..", "reports", "onchain_verification_report.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result, null, 2));

  if (!ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
