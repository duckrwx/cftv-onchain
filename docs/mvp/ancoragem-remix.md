# Ancoragem on-chain via Remix e Sepolia

Este roteiro usa o Remix para demonstrar a ancoragem on-chain sem depender de script de deploy.

## 1. Preparar carteira

1. Abrir a MetaMask.
2. Selecionar rede Sepolia.
3. Garantir saldo de ETH de teste.
4. Usar uma carteira apenas de teste.

## 2. Abrir contrato no Remix

1. Acessar `https://remix.ethereum.org`.
2. Criar arquivo `contracts/CftvCustodyAnchor.sol`.
3. Copiar o conteudo de `contracts/CftvCustodyAnchor.sol`.
4. Compilar com Solidity `0.8.24` ou compativel.

## 3. Deploy

1. Ir em `Deploy & Run Transactions`.
2. Em `Environment`, escolher `Injected Provider - MetaMask`.
3. Confirmar que a rede exibida e Sepolia.
4. Selecionar contrato `CftvCustodyAnchor`.
5. Clicar em `Deploy`.
6. Confirmar a transacao na MetaMask.
7. Guardar o endereco do contrato.

## 4. Gerar parametros localmente

No container:

```text
python3 src/anchor/remix_params.py \
  --validation-report reports/gateway_validation_report.json \
  --package-summary data/packages/camera-001-20260615T210000Z/package_summary.json \
  --manifest data/packages/camera-001-20260615T210000Z/data/hour_manifest.json \
  --output reports/remix_anchor_params.json
```

O arquivo `reports/remix_anchor_params.json` contem os valores para preencher no Remix.

## 5. Chamar `anchorPackage`

No contrato deployado, abrir a funcao:

```text
anchorPackage(
  bytes32 anchorId,
  bytes32 cameraId,
  uint64 captureStart,
  uint64 captureEnd,
  bytes32 packageRoot,
  bytes32 manifestHash,
  uint32 segmentCount,
  uint8 status
)
```

Preencher com os valores de `reports/remix_anchor_params.json`.

O status `1` significa `COMPLETE`.

## 6. Verificar registro

Depois da transacao confirmada:

1. Copiar o mesmo `anchorId`.
2. Chamar `getAnchor(anchorId)`.
3. Conferir se `packageRoot`, `manifestHash`, `segmentCount` e `status` batem com o pacote local.

## 7. Evidencia para o relatorio

Registrar no relatorio:

- endereco do contrato;
- hash da transacao;
- rede usada: Sepolia;
- `packageRoot`;
- `manifestHash`;
- resultado de `getAnchor(anchorId)`;
- print ou link do explorer.

## Observacao tecnica

O contrato nao armazena video nem segmentos. Ele armazena apenas o compromisso criptografico do pacote. A verificacao completa continua sendo feita off-chain pelo verificador, que compara o pacote apresentado com o valor ancorado.

