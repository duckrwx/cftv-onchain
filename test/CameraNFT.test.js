const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("CameraNFT", function () {
  let cameraNFT;
  let owner, gateway, user, attacker;
  let gatewayRegistry, priceOracle;
  let validGatewayId;

  async function deployContracts() {
    [owner, gateway, user, attacker] = await ethers.getSigners();

    const GatewayRegistry = await ethers.getContractFactory("GatewayRegistry");
    gatewayRegistry = await GatewayRegistry.deploy(owner.address);

    const PriceOracle = await ethers.getContractFactory("MockPriceOracle");
    priceOracle = await PriceOracle.deploy();

    const CameraNFT = await ethers.getContractFactory("CameraNFT");
    cameraNFT = await CameraNFT.deploy(
      owner.address,
      await gatewayRegistry.getAddress(),
      await priceOracle.getAddress(),
      0,
      owner.address
    );

    validGatewayId = ethers.keccak256(ethers.toUtf8Bytes("main-gateway"));
    await gatewayRegistry.registerGateway(validGatewayId, gateway.address, "ipfs://QmHash");

    return { cameraNFT, gatewayRegistry, priceOracle, owner, gateway, user, attacker, validGatewayId };
  }

  beforeEach(async function () {
    ({ cameraNFT, gatewayRegistry, priceOracle, owner, gateway, user, attacker, validGatewayId } = 
      await loadFixture(deployContracts));
  });

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await cameraNFT.owner()).to.equal(owner.address);
    });

    it("should set the gateway registry", async function () {
      expect(await cameraNFT.gatewayRegistry()).to.equal(await gatewayRegistry.getAddress());
    });

    it("should set the price oracle", async function () {
      expect(await cameraNFT.priceOracle()).to.equal(await priceOracle.getAddress());
    });
  });

  describe("Access Control", function () {
    it("should reject registerCamera from non-owner", async function () {
      await expect(
        cameraNFT.connect(attacker).registerCamera(validGatewayId, gateway.address, "ipfs://hash")
      ).to.be.revertedWithCustomError(cameraNFT, "OwnableUnauthorizedAccount");
    });

    it("should reject setRegistrationFee from non-owner", async function () {
      await expect(
        cameraNFT.connect(attacker).setRegistrationFee(100)
      ).to.be.revertedWithCustomError(cameraNFT, "OwnableUnauthorizedAccount");
    });

    it("should reject setTreasury from non-owner", async function () {
      await expect(
        cameraNFT.connect(attacker).setTreasury(user.address)
      ).to.be.revertedWithCustomError(cameraNFT, "OwnableUnauthorizedAccount");
    });

    it("should reject updateCameraSigner from non-owner", async function () {
      await cameraNFT.registerCamera(validGatewayId, gateway.address, "ipfs://hash");
      await expect(
        cameraNFT.connect(attacker).updateCameraSigner(1, user.address)
      ).to.be.revertedWithCustomError(cameraNFT, "OwnableUnauthorizedAccount");
    });

    it("should reject setCameraStatus from non-owner", async function () {
      await cameraNFT.registerCamera(validGatewayId, gateway.address, "ipfs://hash");
      await expect(
        cameraNFT.connect(attacker).setCameraStatus(1, false)
      ).to.be.revertedWithCustomError(cameraNFT, "OwnableUnauthorizedAccount");
    });
  });

  describe("Fee Payment", function () {
    it("should register with zero fee", async function () {
      await cameraNFT.registerCamera(validGatewayId, gateway.address, "ipfs://QmHash");
      expect(await cameraNFT.nextTokenId()).to.equal(1);
    });

    it("should reject insufficient fee", async function () {
      await cameraNFT.setRegistrationFee(100);
      await expect(
        cameraNFT.registerCamera(validGatewayId, gateway.address, "ipfs://hash", { value: 0 })
      ).to.be.revertedWith("Insufficient fee");
    });

    it("should accept sufficient fee", async function () {
      await cameraNFT.setRegistrationFee(100);
      const balanceBefore = await ethers.provider.getBalance(cameraNFT.getAddress());
      const tx = await cameraNFT.registerCamera(validGatewayId, gateway.address, "ipfs://hash", { value: ethers.parseEther("0.01") });
      await tx.wait();
      const balanceAfter = await ethers.provider.getBalance(cameraNFT.getAddress());
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("should allow withdrawFees from treasury", async function () {
      await cameraNFT.setRegistrationFee(100);
      await cameraNFT.registerCamera(validGatewayId, gateway.address, "ipfs://hash", { value: ethers.parseEther("0.01") });

      const treasuryBalanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await cameraNFT.withdrawFees();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const treasuryBalanceAfter = await ethers.provider.getBalance(owner.address);

      expect(treasuryBalanceAfter).to.equal(treasuryBalanceBefore - gasUsed + ethers.parseEther("0.01"));
    });

    it("should reject withdrawFees from non-treasury", async function () {
      await cameraNFT.setTreasury(user.address);
      await cameraNFT.registerCamera(validGatewayId, gateway.address, "ipfs://hash", { value: ethers.parseEther("0.01") });

      await expect(
        cameraNFT.withdrawFees()
      ).to.be.revertedWith("Not treasury");
    });
  });

  describe("Camera Registration", function () {
    it("should register a camera and mint to gateway owner", async function () {
      await cameraNFT.registerCamera(validGatewayId, gateway.address, "ipfs://QmHash");
      
      const camera = await cameraNFT.getCamera(1);
      expect(camera.signer).to.equal(gateway.address);
      expect(camera.gatewayId).to.equal(validGatewayId);
      expect(camera.active).to.equal(true);
      
      // Verify NFT was minted to gateway owner, not msg.sender
      expect(await cameraNFT.ownerOf(1)).to.equal(gateway.address);
    });

    it("should increment token IDs correctly", async function () {
      const g2 = ethers.keccak256(ethers.toUtf8Bytes("gateway2"));
      await gatewayRegistry.registerGateway(g2, gateway.address, "ipfs://hash2");
      await cameraNFT.registerCamera(validGatewayId, gateway.address, "ipfs://hash1");
      await cameraNFT.registerCamera(g2, gateway.address, "ipfs://hash2");
      expect(await cameraNFT.nextTokenId()).to.equal(2);
    });

    it("should reject registration with zero signer", async function () {
      const g3 = ethers.keccak256(ethers.toUtf8Bytes("gateway3"));
      await gatewayRegistry.registerGateway(g3, gateway.address, "ipfs://hash3");
      await expect(
        cameraNFT.registerCamera(g3, ethers.ZeroAddress, "ipfs://hash")
      ).to.be.revertedWith("Invalid signer");
    });

    it("should reject if gateway inactive", async function () {
      const inactiveId = ethers.keccak256(ethers.toUtf8Bytes("inactive"));
      await gatewayRegistry.registerGateway(inactiveId, user.address, "ipfs://hash");
      await gatewayRegistry.setGatewayStatus(inactiveId, false);
      await expect(
        cameraNFT.registerCamera(inactiveId, user.address, "ipfs://hash")
      ).to.be.revertedWith("Gateway inactive");
    });

    it("should reject if gateway does not exist", async function () {
      const nonExistentId = ethers.keccak256(ethers.toUtf8Bytes("nonexistent"));
      await expect(
        cameraNFT.registerCamera(nonExistentId, gateway.address, "ipfs://hash")
      ).to.be.revertedWith("Gateway inactive");
    });

    it("should store and return tokenURI correctly", async function () {
      const tokenURI = "ipfs://QmTestHash123";
      await cameraNFT.registerCamera(validGatewayId, gateway.address, tokenURI);
      expect(await cameraNFT.tokenURI(1)).to.equal(tokenURI);
    });
  });

  describe("Camera Updates", function () {
    beforeEach(async function () {
      await cameraNFT.registerCamera(validGatewayId, gateway.address, "ipfs://hash");
    });

    it("should update signer", async function () {
      await cameraNFT.updateCameraSigner(1, user.address);
      const camera = await cameraNFT.getCamera(1);
      expect(camera.signer).to.equal(user.address);
    });

    it("should toggle camera status", async function () {
      await cameraNFT.setCameraStatus(1, false);
      const camera = await cameraNFT.getCamera(1);
      expect(camera.active).to.equal(false);
      
      await cameraNFT.setCameraStatus(1, true);
      const cameraAfter = await cameraNFT.getCamera(1);
      expect(cameraAfter.active).to.equal(true);
    });

    it("should reject update for non-existent camera", async function () {
      await expect(
        cameraNFT.updateCameraSigner(999, user.address)
      ).to.be.revertedWith("Camera not found");
    });
  });

  describe("Fee Management", function () {
    it("should update registration fee", async function () {
      await cameraNFT.setRegistrationFee(100);
      expect(await cameraNFT.usdRegistrationFee()).to.equal(100);
    });

    it("should update treasury", async function () {
      await cameraNFT.setTreasury(user.address);
      expect(await cameraNFT.treasury()).to.equal(user.address);
    });

    it("should reject zero treasury", async function () {
      await expect(
        cameraNFT.setTreasury(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid treasury");
    });
  });
});

describe("GatewayRegistry", function () {
  let gatewayRegistry;
  let owner, gateway1, gateway2, attacker;

  beforeEach(async function () {
    [owner, gateway1, gateway2, attacker] = await ethers.getSigners();
    const GatewayRegistry = await ethers.getContractFactory("GatewayRegistry");
    gatewayRegistry = await GatewayRegistry.deploy(owner.address);
  });

  describe("Deployment", function () {
    it("should set the owner", async function () {
      expect(await gatewayRegistry.owner()).to.equal(owner.address);
    });
  });

  describe("Gateway Management", function () {
    it("should register a gateway", async function () {
      const gatewayId = ethers.keccak256(ethers.toUtf8Bytes("gateway1"));
      await expect(gatewayRegistry.registerGateway(gatewayId, gateway1.address, "ipfs://QmHash"))
        .to.emit(gatewayRegistry, "GatewayRegistered")
        .withArgs(gatewayId, gateway1.address, "ipfs://QmHash");

      expect(await gatewayRegistry.isGatewayActive(gatewayId)).to.equal(true);
    });

    it("should set gateway status", async function () {
      const gatewayId = ethers.keccak256(ethers.toUtf8Bytes("gateway1"));
      await gatewayRegistry.registerGateway(gatewayId, gateway1.address, "ipfs://hash");

      await gatewayRegistry.setGatewayStatus(gatewayId, false);
      expect(await gatewayRegistry.isGatewayActive(gatewayId)).to.equal(false);
    });

    it("should update metadata", async function () {
      const gatewayId = ethers.keccak256(ethers.toUtf8Bytes("gateway1"));
      await gatewayRegistry.registerGateway(gatewayId, gateway1.address, "ipfs://old");

      await gatewayRegistry.updateGatewayMetadata(gatewayId, "ipfs://new");
      const gw = await gatewayRegistry.getGateway(gatewayId);
      expect(gw[2]).to.equal("ipfs://new");
    });

    it("should return correct gateway owner", async function () {
      const gatewayId = ethers.keccak256(ethers.toUtf8Bytes("gateway1"));
      await gatewayRegistry.registerGateway(gatewayId, gateway1.address, "ipfs://hash");
      expect(await gatewayRegistry.getGatewayOwner(gatewayId)).to.equal(gateway1.address);
    });

    it("should reject registration by non-owner", async function () {
      const gatewayId = ethers.keccak256(ethers.toUtf8Bytes("gateway1"));
      await expect(
        gatewayRegistry.connect(attacker).registerGateway(gatewayId, gateway1.address, "ipfs://hash")
      ).to.be.revertedWithCustomError(gatewayRegistry, "OwnableUnauthorizedAccount");
    });

    it("should reject duplicate gateway", async function () {
      const gatewayId = ethers.keccak256(ethers.toUtf8Bytes("gateway1"));
      await gatewayRegistry.registerGateway(gatewayId, gateway1.address, "ipfs://hash");
      await expect(
        gatewayRegistry.registerGateway(gatewayId, gateway2.address, "ipfs://hash2")
      ).to.be.revertedWith("Gateway exists");
    });

    it("should reject status update for non-existent gateway", async function () {
      const gatewayId = ethers.keccak256(ethers.toUtf8Bytes("nonexistent"));
      await expect(
        gatewayRegistry.setGatewayStatus(gatewayId, false)
      ).to.be.revertedWith("Gateway not found");
    });
  });
});