const fs = require("fs");
const path = require("path");

async function main() {
  const contractAddress = process.env.ANCHOR_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("Defina ANCHOR_CONTRACT_ADDRESS.");
  }

  const manifestPath = path.join(
    __dirname,
    "..",
    "data",
    "packages",
    "camera-001-20260615T210000Z",
    "data",
    "hour_manifest.json"
  );
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const anchorId = ethers.id(`${manifest.camera_id}:${manifest.capture_start}`);

  const contract = await ethers.getContractAt("CftvCustodyAnchor", contractAddress);
  const anchor = await contract.getAnchor(anchorId);

  const result = {
    anchorId,
    cameraIdHash: anchor.cameraId,
    captureStart: Number(anchor.captureStart),
    captureEnd: Number(anchor.captureEnd),
    packageRoot: anchor.packageRoot,
    manifestHash: anchor.manifestHash,
    segmentCount: Number(anchor.segmentCount),
    status: Number(anchor.status),
    submitter: anchor.submitter,
    blockTimestamp: Number(anchor.blockTimestamp),
    exists: anchor.exists,
  };
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
