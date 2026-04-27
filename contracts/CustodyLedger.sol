// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ICameraNFT {
    function getCamera(uint256 tokenId) external view returns (uint256, bytes32, address, bool);
}

contract CustodyLedger is ReentrancyGuard {
    enum EventType {
        VIDEO_SLOT_RECORDED,
        CAMERA_OFFLINE,
        PROCESSING_FAILED,
        SLOT_DURATION_MISMATCH,
        RECORDING_RESUMED
    }

    struct CameraEvent {
        bytes32 eventHash;
        uint256 cameraTokenId;
        bytes32 gatewayId;
        EventType eventType;
        uint64 slotStart;
        uint64 slotEnd;
        uint64 expectedDuration;
        uint64 actualDuration;
        bytes32 videoHash;
        bytes32 prevEventHash;
        string metadataURI;
        uint256 createdAt;
        bool exists;
    }

    ICameraNFT public immutable cameraNFT;

    mapping(bytes32 => CameraEvent) private _events;
    mapping(uint256 => bytes32) public latestEventByCamera;

    event CameraEventRecorded(
        bytes32 indexed eventHash,
        uint256 indexed cameraTokenId,
        bytes32 indexed gatewayId,
        EventType eventType,
        uint64 slotStart,
        uint64 slotEnd,
        bytes32 prevEventHash,
        bytes32 videoHash,
        string metadataURI,
        uint256 createdAt,
        address signer
    );

    constructor(address cameraNFTAddress) {
        require(cameraNFTAddress != address(0), "Invalid camera NFT");
        cameraNFT = ICameraNFT(cameraNFTAddress);
    }

    function recordCameraEvent(
        uint256 cameraTokenId,
        EventType eventType,
        uint64 slotStart,
        uint64 slotEnd,
        uint64 expectedDuration,
        uint64 actualDuration,
        bytes32 videoHash,
        bytes32 prevEventHash,
        string calldata metadataURI
    ) external nonReentrant {
        // Checks
        (uint256 tokenId, bytes32 gatewayId, address signer, bool active) = cameraNFT.getCamera(cameraTokenId);
        require(tokenId == cameraTokenId, "Invalid camera");
        require(active, "Camera inactive");
        require(msg.sender == signer, "Invalid signer");
        require(slotStart < slotEnd, "Invalid slot");
        require(prevEventHash == latestEventByCamera[cameraTokenId], "Broken event chain");

        // Effects - compute hash first
        bytes32 eventHash = keccak256(
            abi.encode(
                cameraTokenId,
                gatewayId,
                eventType,
                slotStart,
                slotEnd,
                expectedDuration,
                actualDuration,
                videoHash,
                prevEventHash,
                metadataURI
            )
        );

        require(!_events[eventHash].exists, "Event exists");

        // Effects - store event
        _events[eventHash] = CameraEvent({
            eventHash: eventHash,
            cameraTokenId: cameraTokenId,
            gatewayId: gatewayId,
            eventType: eventType,
            slotStart: slotStart,
            slotEnd: slotEnd,
            expectedDuration: expectedDuration,
            actualDuration: actualDuration,
            videoHash: videoHash,
            prevEventHash: prevEventHash,
            metadataURI: metadataURI,
            createdAt: block.timestamp,
            exists: true
        });

        latestEventByCamera[cameraTokenId] = eventHash;

        // Interactions - emit event
        emit CameraEventRecorded(
            eventHash,
            cameraTokenId,
            gatewayId,
            eventType,
            slotStart,
            slotEnd,
            prevEventHash,
            videoHash,
            metadataURI,
            block.timestamp,
            signer
        );
    }

    function getEvent(bytes32 eventHash) external view returns (CameraEvent memory) {
        require(_events[eventHash].exists, "Event not found");
        return _events[eventHash];
    }

    function hasEvent(bytes32 eventHash) external view returns (bool) {
        return _events[eventHash].exists;
    }
}