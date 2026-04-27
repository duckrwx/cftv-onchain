// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract GatewayRegistry is Ownable {
    struct Gateway {
        bytes32 gatewayId;
        address gatewayOwner;
        string metadataURI;
        bool active;
        bool exists;
    }

    mapping(bytes32 => Gateway) private _gateways;

    event GatewayRegistered(bytes32 indexed gatewayId, address indexed gatewayOwner, string metadataURI);
    event GatewayStatusUpdated(bytes32 indexed gatewayId, bool active);
    event GatewayMetadataUpdated(bytes32 indexed gatewayId, string metadataURI);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function registerGateway(bytes32 gatewayId, address gatewayOwner, string calldata metadataURI) external onlyOwner {
        require(gatewayId != bytes32(0), "Invalid gatewayId");
        require(!_gateways[gatewayId].exists, "Gateway exists");
        require(gatewayOwner != address(0), "Invalid gateway owner");

        _gateways[gatewayId] = Gateway({
            gatewayId: gatewayId,
            gatewayOwner: gatewayOwner,
            metadataURI: metadataURI,
            active: true,
            exists: true
        });

        emit GatewayRegistered(gatewayId, gatewayOwner, metadataURI);
    }

    function setGatewayStatus(bytes32 gatewayId, bool active) external onlyOwner {
        require(_gateways[gatewayId].exists, "Gateway not found");
        _gateways[gatewayId].active = active;
        emit GatewayStatusUpdated(gatewayId, active);
    }

    function updateGatewayMetadata(bytes32 gatewayId, string calldata metadataURI) external onlyOwner {
        require(_gateways[gatewayId].exists, "Gateway not found");
        _gateways[gatewayId].metadataURI = metadataURI;
        emit GatewayMetadataUpdated(gatewayId, metadataURI);
    }

    function getGateway(bytes32 gatewayId) external view returns (Gateway memory) {
        require(_gateways[gatewayId].exists, "Gateway not found");
        return _gateways[gatewayId];
    }

    function isGatewayActive(bytes32 gatewayId) external view returns (bool) {
        return _gateways[gatewayId].exists && _gateways[gatewayId].active;
    }

    function getGatewayOwner(bytes32 gatewayId) external view returns (address) {
        require(_gateways[gatewayId].exists, "Gateway not found");
        return _gateways[gatewayId].gatewayOwner;
    }
}
