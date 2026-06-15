# Estrutura do MVP de cadeia de custodia

Este repositorio agora esta focado no MVP de cadeia de custodia verificavel para video CFTV. A estrutura Web3 anterior foi removida porque nao faz parte do escopo atual.

O foco e demonstrar primeiro o fluxo local de integridade, assinatura, empacotamento e verificacao. A ancoragem on-chain real entra depois, como evolucao do registro local.

## Pastas principais

- `data/input/`: video original de teste.
- `data/segments/`: segmentos gerados pelo `ffmpeg`.
- `data/packages/`: pacotes SIP BagIt gerados pelo empacotador.
- `data/tampered/`: copias adulteradas para testes controlados.
- `data/anchor/`: registro local de ancoragem antes da blockchain real.
- `keys/`: chave privada e chave publica do dispositivo simulado.
- `src/segmenter/`: segmentacao do video.
- `src/packager/`: hashes, manifesto, assinatura e pacote.
- `src/gateway/`: validacao de pacote antes da ancoragem.
- `src/anchor/`: simulador de ancoragem local e futura integracao on-chain.
- `src/verifier/`: verificador independente e relatorio pericial.
- `reports/`: relatorios de pacote integro e pacote adulterado.

## Ordem de implementacao

1. `segmenter`
2. `packager`
3. `gateway`
4. `anchor` local
5. `verifier`
6. cenarios adulterados
7. contrato on-chain minimo

## Decisao atual

O Raspberry Pi nao e dependencia do primeiro MVP. O container simula o dispositivo de borda. Depois que o fluxo local estiver funcionando, o mesmo codigo pode ser testado em Raspberry para medir viabilidade em hardware real.
