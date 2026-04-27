# Architecture

## Core idea

The protocol authenticates cameras as on-chain identities (ERC-721) linked to registered gateways. Each camera has an authorized signer wallet that can publish custody events to the ledger.

## Components

- Gateway registry with gateway owner
- Camera NFT identity minted to the gateway owner
- Custody ledger with per-camera chained events
- Protocol token
- Staking
- Simple governance for camera registration USD fee
- Chainlink price oracle for USD to wei conversion
