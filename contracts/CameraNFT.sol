// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./GatewayRegistry.sol";
import "./MockPriceOracle.sol";

contract CameraNFT is ERC721, Ownable, ReentrancyGuard {
    struct Camera {
        uint256 tokenId;
        bytes32 gatewayId;
        address signer;
        bool active;
    }

    GatewayRegistry public immutable gatewayRegistry;
    MockPriceOracle public immutable priceOracle;
    uint256 public nextTokenId;
    uint256 public usdRegistrationFee;
    address public treasury;

    mapping(uint256 => Camera) private _cameras;
    mapping(uint256 => string) private _tokenURIs;

    event CameraRegistered(uint256 indexed tokenId, bytes32 indexed gatewayId, address signer, string tokenURI);
    event CameraSignerUpdated(uint256 indexed tokenId, address signer);
    event CameraStatusUpdated(uint256 indexed tokenId, bool active);
    event RegistrationFeeUpdated(uint256 newFee);
    event TreasuryUpdated(address indexed treasury);
    event FeesWithdrawn(address indexed treasury, uint256 amount);

    constructor(
        address initialOwner,
        address gatewayRegistryAddress,
        address priceOracleAddress,
        uint256 initialUsdRegistrationFee,
        address initialTreasury
    ) ERC721("CCTV Camera Identity", "CAM") Ownable(initialOwner) {
        require(initialTreasury != address(0), "Invalid treasury");
        gatewayRegistry = GatewayRegistry(gatewayRegistryAddress);
        priceOracle = MockPriceOracle(priceOracleAddress);
        usdRegistrationFee = initialUsdRegistrationFee;
        treasury = initialTreasury;
    }

    function registerCamera(bytes32 gatewayId, address signer, string calldata tokenURI_) 
        external 
        payable 
        onlyOwner 
        nonReentrant
        returns (uint256) 
    {
        // Checks
        require(gatewayRegistry.isGatewayActive(gatewayId), "Gateway inactive");
        require(signer != address(0), "Invalid signer");

        address gatewayOwner = gatewayRegistry.getGatewayOwner(gatewayId);
        require(gatewayOwner != address(0), "Gateway owner missing");

        uint256 requiredFeeWei = priceOracle.convertUsdToWei(usdRegistrationFee);
        require(msg.value >= requiredFeeWei, "Insufficient fee");

        // Effects - atualizar estado ANTES do mint
        uint256 tokenId = ++nextTokenId;
        
        _cameras[tokenId] = Camera({
            tokenId: tokenId,
            gatewayId: gatewayId,
            signer: signer,
            active: true
        });
        _tokenURIs[tokenId] = tokenURI_;

        // Interactions - mint por último
        _safeMint(gatewayOwner, tokenId);

        emit CameraRegistered(tokenId, gatewayId, signer, tokenURI_);
        return tokenId;
    }

    function setRegistrationFee(uint256 newFee) external onlyOwner {
        usdRegistrationFee = newFee;
        emit RegistrationFeeUpdated(newFee);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function updateCameraSigner(uint256 tokenId, address signer) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Camera not found");
        require(signer != address(0), "Invalid signer");
        _cameras[tokenId].signer = signer;
        emit CameraSignerUpdated(tokenId, signer);
    }

    function setCameraStatus(uint256 tokenId, bool active) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Camera not found");
        _cameras[tokenId].active = active;
        emit CameraStatusUpdated(tokenId, active);
    }

    function withdrawFees() external nonReentrant {
        require(msg.sender == treasury, "Not treasury");
        
        // Effects - salvar amount antes de enviar
        uint256 amount = address(this).balance;
        require(amount > 0, "No balance");
        
        // Interactions
        (bool ok, ) = payable(treasury).call{value: amount}("");
        require(ok, "Withdraw failed");

        emit FeesWithdrawn(treasury, amount);
    }

    function getCamera(uint256 tokenId) external view returns (Camera memory) {
        require(_ownerOf(tokenId) != address(0), "Camera not found");
        return _cameras[tokenId];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Not found");
        return _tokenURIs[tokenId];
    }
}