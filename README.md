# cftv-onchain

MVP de protocolo Web3 para autenticação de câmeras em gateways e registro on-chain de eventos de custódia.

## Contratos

- `ProtocolToken.sol`: ERC-20 do protocolo
- `GatewayRegistry.sol`: registro de gateways com `gatewayOwner`
- `CameraNFT.sol`: ERC-721 que representa a identidade da câmera autenticada em um gateway
- `CustodyLedger.sol`: ledger de eventos encadeados por câmera
- `Staking.sol`: staking simples do token
- `SimpleGovernance.sol`: governança mínima para alterar a taxa de registro em USD
- `PriceOracle.sol`: leitura de preço via Chainlink e conversão USD -> wei

## Fluxo do MVP

1. Owner registra um gateway com `gatewayOwner`.
2. Owner registra uma câmera em um gateway via `CameraNFT`.
3. O NFT da câmera é mintado para o `gatewayOwner`.
4. Cada câmera possui uma wallet autorizada (`signer`).
5. Apenas a wallet da câmera pode enviar eventos ao `CustodyLedger`.
6. Os eventos podem representar vídeo normal ou exceções operacionais.
7. A taxa de registro é definida em USD e convertida para wei via Chainlink.
8. A governança pode alterar a taxa de registro de novas câmeras.

## Eventos simulados

- `VIDEO_SLOT_RECORDED`
- `CAMERA_OFFLINE`
- `PROCESSING_FAILED`
- `SLOT_DURATION_MISMATCH`
- `RECORDING_RESUMED`

## Estrutura recomendada

- `contracts/`: contratos Solidity
- `scripts/`: deploy e interação via ethers.js
- `test/`: testes Hardhat
- `backend/`: simulador/processador off-chain
- `docs/`: arquitetura, fluxo e entrega
- `audit/`: relatórios Slither/Mythril

## Próximos passos

- criar scripts de deploy
- criar testes Hardhat
- integrar frontend ou scripts ethers.js
- revisar consistência dos contratos e rodar auditoria inicial
- fazer deploy em Sepolia
