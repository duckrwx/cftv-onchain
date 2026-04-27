# cftv-onchain

MVP de protocolo Web3 para autenticação de câmeras em gateways e registro on-chain de eventos de custódia, com deploy em testnet Ethereum.

## Objetivo

O projeto demonstra um fluxo mínimo de identidade, registro e governança para um cenário de CFTV on-chain:

1. um gateway é registrado;
2. uma câmera é vinculada a esse gateway;
3. a câmera recebe uma identidade on-chain via NFT;
4. uma wallet autorizada passa a registrar eventos operacionais da câmera;
5. a taxa de registro pode ser ajustada por governança;
6. o valor da taxa em USD é convertido para wei via oráculo.

## Contratos do projeto

### 1. `ProtocolToken.sol`
Token ERC-20 do protocolo.

Responsabilidades:
- mint inicial no deploy;
- função `mint` restrita ao owner;
- servir como base para governança e staking.

Observação:
- o contrato faz `_mint(initialOwner, initialSupply)`;
- portanto, `initialSupply` deve ser informado já na unidade do token, normalmente com 18 decimais.

Exemplo:
- 1.000.000 tokens = `1000000000000000000000000`

### 2. `GatewayRegistry.sol`
Registro de gateways autorizados.

Responsabilidades:
- registrar gateways;
- armazenar `gatewayOwner` e `metadataURI`;
- ativar ou desativar gateways;
- expor consultas de gateway.

Funções principais:
- `registerGateway`
- `setGatewayStatus`
- `updateGatewayMetadata`
- `getGateway`
- `isGatewayActive`
- `getGatewayOwner`

### 3. `CameraNFT.sol`
NFT ERC-721 que representa a identidade da câmera.

Responsabilidades:
- registrar câmeras vinculadas a gateways ativos;
- cobrar taxa de registro em ETH com referência em USD;
- mintar o NFT para o `gatewayOwner`;
- armazenar signer autorizado e status da câmera.

Dependências:
- `GatewayRegistry`
- `PriceOracle` ou `MockPriceOracle`

Funções principais:
- `registerCamera`
- `setRegistrationFee`
- `setTreasury`
- `updateCameraSigner`
- `setCameraStatus`
- `withdrawFees`
- `getCamera`
- `tokenURI`

Observação importante:
- o parâmetro `gatewayRegistryAddress` é o endereço do contrato `GatewayRegistry`, não de um gateway específico.

### 4. `CustodyLedger.sol`
Ledger on-chain de eventos encadeados por câmera.

Responsabilidades:
- registrar eventos operacionais da câmera;
- manter encadeamento por `prevEventHash`;
- garantir que apenas o `signer` autorizado registre eventos;
- preservar trilha de auditoria por câmera.

Funções principais:
- `recordCameraEvent`
- `getEvent`
- `hasEvent`
- `latestEventByCamera`

Eventos de exemplo:
- `VIDEO_SLOT_RECORDED`
- `CAMERA_OFFLINE`
- `PROCESSING_FAILED`
- `SLOT_DURATION_MISMATCH`
- `RECORDING_RESUMED`

### 5. `PriceOracle.sol`
Oráculo de preço usando Chainlink.

Responsabilidades:
- consultar o feed ETH/USD;
- validar preço negativo ou stale;
- converter valores em USD com 8 decimais para wei.

Funções principais:
- `getLatestPrice`
- `convertUsdToWei`

Observação:
- o contrato referencia o feed da Chainlink para Sepolia.

### 6. `SimpleGovernance.sol`
Governança mínima baseada em saldo de ERC-20.

Responsabilidades:
- criar propostas;
- permitir votação com peso por saldo de token;
- executar propostas aprovadas;
- alterar a taxa de registro do `CameraNFT`.

Funções principais:
- `createProposal`
- `vote`
- `executeProposal`

Observação:
- o contrato implementa uma governança simples, suficiente para o MVP e para demonstração acadêmica.

### 7. `Staking.sol`
Contrato de staking do token.

Responsabilidades atuais:
- receber stake de tokens;
- armazenar saldo em stake por usuário;
- permitir saque;
- armazenar um `rewardRate` configurável.

Funções principais:
- `stake`
- `withdraw`
- `setRewardRate`

Limitação atual:
- o contrato ainda não implementa cálculo real nem distribuição de recompensa;
- hoje `rewardRate` é apenas armazenado, sem efeito prático no pagamento de rewards.

Essa limitação deve ser apresentada com honestidade na documentação e na demo.

## Fluxo do MVP

1. O owner registra um gateway no `GatewayRegistry`.
2. O owner registra uma câmera no `CameraNFT` usando um `gatewayId` ativo.
3. O `CameraNFT` consulta o oráculo para converter a taxa em USD para wei.
4. O NFT da câmera é mintado para o `gatewayOwner`.
5. A câmera passa a ter um `signer` autorizado.
6. O `signer` registra eventos no `CustodyLedger`.
7. A governança pode propor e votar mudanças na taxa de registro.
8. O staking permite depósito e retirada de tokens do protocolo.

## Requisitos acadêmicos cobertos

O projeto cobre os seguintes itens da atividade:

- ERC-20: `ProtocolToken`
- NFT ERC-721: `CameraNFT`
- Governança simples: `SimpleGovernance`
- Oráculo: `PriceOracle` com Chainlink
- Integração com backend Web3: estrutura `backend/` e integração via scripts/ethers.js
- Deploy em testnet: Sepolia

Cobertura parcial:
- Staking: existe contrato funcional para stake e withdraw, mas a lógica de recompensa ainda precisa evoluir para cobrir integralmente o requisito de “staking com recompensa”.

## Estrutura do projeto

- `contracts/`: contratos Solidity
- `artifacts/`: artefatos de compilação
- `backend/`: integração/processamento off-chain
- `audit/`: anotações e relatórios de auditoria
- `hardhat.config.js`: configuração do Hardhat

## Segurança aplicada

O projeto utiliza práticas importantes para o escopo do MVP:

- Solidity `^0.8.20`
- `Ownable` para controle de acesso
- `ReentrancyGuard` em funções sensíveis
- validações de endereço nulo
- validações de consistência de fluxo
- oracle com checagem de preço stale e preço negativo

## Limitações atuais

As principais limitações do estado atual são:

1. `Staking.sol` ainda não distribui recompensa real.
2. `SimpleGovernance.sol` é propositalmente simples e altera apenas a taxa de registro.
3. O contrato `CameraNFT.sol` importa `MockPriceOracle`, então a configuração final de deploy deve ser coerente com o contrato efetivamente usado em Sepolia.
4. Ainda é recomendável ampliar testes automatizados e relatório formal de auditoria.

## Demonstração recomendada

Para vídeo de apresentação, o fluxo mais forte é:

1. mostrar os contratos deployados na Sepolia;
2. mostrar saldo ou mint do `ProtocolToken`;
3. registrar e consultar um gateway;
4. registrar uma câmera e mostrar o NFT criado;
5. registrar um evento no `CustodyLedger`;
6. criar uma proposta na governança e votar;
7. mostrar `stake`, `stakedBalance` e `withdraw` no `Staking`.

Observação:
- ao mostrar o staking, é melhor dizer com precisão que o contrato já implementa depósito e retirada, mas ainda não faz distribuição real de rewards.

## Próximos passos

- finalizar scripts de deploy e interação;
- ampliar testes Hardhat;
- consolidar relatório de auditoria com Slither, Mythril e Hardhat;
- decidir se o staking será evoluído para recompensa real antes da entrega final;
- organizar endereços de deploy e links do explorer no material da entrega.
