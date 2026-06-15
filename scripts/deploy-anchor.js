const fs = require("fs");
const path = require("path");

async function main() {
  const Contract = await ethers.getContractFactory("CftvCustodyAnchor");
  const contract = await Contract.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const deployment = {
    contract: "CftvCustodyAnchor",
    address,
    network: network.name,
    deployedAt: new Date().toISOString(),
  };

  const outDir = path.join(__dirname, "..", "data", "anchor");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, `deployment-${network.name}.json`),
    JSON.stringify(deployment, null, 2) + "\n"
  );

  console.log(JSON.stringify(deployment, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
