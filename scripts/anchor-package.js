const fs = require("fs");
const path = require("path");

function toBytes32FromText(value) {
  return ethers.id(value);
}

function toBytes32FromHex(value) {
  return value.startsWith("0x") ? value : `0x${value}`;
}

function unixSeconds(value) {
  return Math.floor(new Date(value).getTime() / 1000);
}

async function main() {
  const contractAddress = process.env.ANCHOR_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("Defina ANCHOR_CONTRACT_ADDRESS.");
  }

  const reportPath = path.join(__dirname, "..", "reports", "gateway_validation_report.json");
  const packageSummaryPath = path.join(
    __dirname,
    "..",
    "data",
    "packages",
    "camera-001-20260615T210000Z",
    "package_summary.json"
  );
  const manifestPath = path.join(
    __dirname,
    "..",
    "data",
    "packages",
    "camera-001-20260615T210000Z",
    "data",
    "hour_manifest.json"
  );

  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const summary = JSON.parse(fs.readFileSync(packageSummaryPath, "utf8"));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  if (report.status !== "COMPLETE") {
    throw new Error("Pacote precisa estar COMPLETE antes da ancoragem on-chain.");
  }

  const anchorId = toBytes32FromText(`${manifest.camera_id}:${manifest.capture_start}`);
  const cameraId = toBytes32FromText(manifest.camera_id);
  const captureStart = unixSeconds(manifest.capture_start);
  const captureEnd = unixSeconds(manifest.capture_end);
  const packageRoot = toBytes32FromHex(report.package_root_hash);
  const manifestHash = toBytes32FromHex(summary.manifest_hash);
  const segmentCount = manifest.segment_count;
  const status = 1;

  const contract = await ethers.getContractAt("CftvCustodyAnchor", contractAddress);
  const tx = await contract.anchorPackage(
    anchorId,
    cameraId,
    captureStart,
    captureEnd,
    packageRoot,
    manifestHash,
    segmentCount,
    status
  );
  const receipt = await tx.wait();

  const result = {
    network: network.name,
    contractAddress,
    txHash: receipt.hash,
    anchorId,
    cameraId: manifest.camera_id,
    captureStart: manifest.capture_start,
    captureEnd: manifest.capture_end,
    packageRootHash: report.package_root_hash,
    manifestHash: summary.manifest_hash,
    segmentCount,
    status,
    anchoredAt: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, "..", "reports", `onchain_anchor_${network.name}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
