// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CftvCustodyAnchor {
    struct Anchor {
        bytes32 cameraId;
        uint64 captureStart;
        uint64 captureEnd;
        bytes32 packageRoot;
        bytes32 manifestHash;
        uint32 segmentCount;
        uint8 status;
        address submitter;
        uint256 blockTimestamp;
        bool exists;
    }

    mapping(bytes32 => Anchor) private anchors;

    event PackageAnchored(
        bytes32 indexed anchorId,
        bytes32 indexed cameraId,
        uint64 indexed captureStart,
        uint64 captureEnd,
        bytes32 packageRoot,
        bytes32 manifestHash,
        uint32 segmentCount,
        uint8 status,
        address submitter,
        uint256 blockTimestamp
    );

    function anchorPackage(
        bytes32 anchorId,
        bytes32 cameraId,
        uint64 captureStart,
        uint64 captureEnd,
        bytes32 packageRoot,
        bytes32 manifestHash,
        uint32 segmentCount,
        uint8 status
    ) external {
        require(anchorId != bytes32(0), "anchorId vazio");
        require(cameraId != bytes32(0), "cameraId vazio");
        require(packageRoot != bytes32(0), "packageRoot vazio");
        require(manifestHash != bytes32(0), "manifestHash vazio");
        require(captureEnd >= captureStart, "janela invalida");
        require(segmentCount > 0, "sem segmentos");
        require(!anchors[anchorId].exists, "ancora ja existe");

        anchors[anchorId] = Anchor({
            cameraId: cameraId,
            captureStart: captureStart,
            captureEnd: captureEnd,
            packageRoot: packageRoot,
            manifestHash: manifestHash,
            segmentCount: segmentCount,
            status: status,
            submitter: msg.sender,
            blockTimestamp: block.timestamp,
            exists: true
        });

        emit PackageAnchored(
            anchorId,
            cameraId,
            captureStart,
            captureEnd,
            packageRoot,
            manifestHash,
            segmentCount,
            status,
            msg.sender,
            block.timestamp
        );
    }

    function getAnchor(bytes32 anchorId) external view returns (Anchor memory) {
        require(anchors[anchorId].exists, "ancora inexistente");
        return anchors[anchorId];
    }

    function hasAnchor(bytes32 anchorId) external view returns (bool) {
        return anchors[anchorId].exists;
    }
}
