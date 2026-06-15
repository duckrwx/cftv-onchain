# cftv-custody-mvp

MVP de cadeia de custodia verificavel para videos CFTV.

O objetivo e demonstrar, em ambiente local, que um video pode ser segmentado, hasheado, empacotado, assinado e posteriormente verificado contra um registro de ancoragem. A blockchain entra depois que o fluxo local estiver funcionando.

## Fluxo do MVP

```text
video.mp4
  -> segmentacao em blocos
  -> SHA-256 por segmento
  -> hour_manifest.json
  -> assinatura do manifesto
  -> pacote SIP BagIt
  -> validacao pelo gateway
  -> ancoragem local
  -> verificacao independente
```

## Estrutura

- `data/input/`: video original de teste.
- `data/segments/`: segmentos gerados pelo segmentador.
- `data/packages/`: pacotes SIP BagIt.
- `data/tampered/`: copias adulteradas para testes.
- `data/anchor/`: registro local de ancoragem.
- `keys/`: chaves do dispositivo de borda simulado.
- `src/segmenter/`: segmentacao do video.
- `src/packager/`: hashes, manifesto, assinatura e pacote.
- `src/gateway/`: validacao de pacote antes da ancoragem.
- `src/anchor/`: ancoragem local e futura integracao on-chain.
- `src/verifier/`: verificador independente.
- `reports/`: relatorios de verificacao.
- `docs/mvp/`: documentacao de execucao.

## Decisoes atuais

- O Raspberry Pi nao e dependencia do primeiro MVP.
- O container simula o dispositivo de borda.
- A ancoragem sera local primeiro, em `data/anchor/`.
- A blockchain sera adicionada depois como evolucao.
- O foco inicial e provar integridade, completude, ordem temporal e verificacao independente.

## Critério de sucesso

O MVP sera considerado funcional quando produzir dois resultados:

```text
pacote original -> verificador retorna INTEGRO
pacote adulterado -> verificador identifica a falha
```

## Ordem de implementacao

1. Implementar `src/segmenter`.
2. Implementar `src/packager`.
3. Gerar manifesto e assinatura.
4. Montar pacote SIP BagIt.
5. Implementar `src/gateway`.
6. Implementar ancoragem local em `src/anchor`.
7. Implementar `src/verifier`.
8. Gerar relatorio integro.
9. Criar pacote adulterado.
10. Gerar relatorio adulterado.

