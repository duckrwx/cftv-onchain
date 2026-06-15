const { expect } = require("chai");

describe("CftvCustodyAnchor", function () {
  it("anchors a package once and exposes it", async function () {
    const Contract = await ethers.getContractFactory("CftvCustodyAnchor");
    const contract = await Contract.deploy();

    const anchorId = ethers.id("camera-001:2026-06-15T21:00:00Z");
    const cameraId = ethers.id("camera-001");
    const packageRoot = `0x${"11".repeat(32)}`;
    const manifestHash = `0x${"22".repeat(32)}`;

    await expect(
      contract.anchorPackage(anchorId, cameraId, 1781557200, 1781557207, packageRoot, manifestHash, 4, 1)
    ).to.emit(contract, "PackageAnchored");

    const anchor = await contract.getAnchor(anchorId);
    expect(anchor.cameraId).to.equal(cameraId);
    expect(anchor.packageRoot).to.equal(packageRoot);
    expect(anchor.manifestHash).to.equal(manifestHash);
    expect(anchor.segmentCount).to.equal(4);
    expect(anchor.status).to.equal(1);
    expect(anchor.exists).to.equal(true);

    await expect(
      contract.anchorPackage(anchorId, cameraId, 1781557200, 1781557207, packageRoot, manifestHash, 4, 1)
    ).to.be.revertedWith("ancora ja existe");
  });
});
