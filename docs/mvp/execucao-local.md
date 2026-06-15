# Execucao local do MVP

Este documento registra o fluxo local ja implementado.

## 1. Segmentar video

```text
python3 src/segmenter/segment_video.py \
  --input data/input/video.mp4 \
  --output-dir data/segments \
  --segment-seconds 2 \
  --metadata data/segments/segments_metadata.json \
  --mode reencode
```

Resultado atual:

```text
segment_0000.mp4
segment_0001.mp4
segment_0002.mp4
segment_0003.mp4
```

## 2. Gerar pacote SIP BagIt

```text
python3 src/packager/create_package.py \
  --segments-dir data/segments \
  --output-dir data/packages \
  --package-id camera-001-20260615T210000Z \
  --segment-seconds 2 \
  --source-duration-seconds 7.7
```

Resultado:

```text
data/packages/camera-001-20260615T210000Z
```

## 3. Validar pacote no gateway

```text
python3 src/gateway/validate_package.py \
  --package data/packages/camera-001-20260615T210000Z \
  --public-key keys/device_public.pem \
  --report reports/gateway_validation_report.json
```

Resultado esperado:

```text
status: COMPLETE
bagit_valid: true
signature_valid: true
sequence_valid: true
```

## 4. Ancorar localmente

```text
python3 src/anchor/anchor_package.py \
  --validation-report reports/gateway_validation_report.json \
  --registry data/anchor/anchor_registry.json \
  --anchor-report reports/anchor_report.json
```

Resultado:

```text
data/anchor/anchor_registry.json
```

## 5. Verificar pacote integro

```text
python3 src/verifier/verify_package.py \
  --package data/packages/camera-001-20260615T210000Z \
  --public-key keys/device_public.pem \
  --registry data/anchor/anchor_registry.json \
  --report reports/integrity_report.json
```

Resultado esperado:

```text
status: INTEGRO
```

## 6. Verificar pacote adulterado

Criar pacote adulterado:

```text
rm -rf data/tampered/camera-001-20260615T210000Z-segment-modified
cp -a data/packages/camera-001-20260615T210000Z \
  data/tampered/camera-001-20260615T210000Z-segment-modified
printf 'tamper' >> \
  data/tampered/camera-001-20260615T210000Z-segment-modified/data/segments/segment_0001.mp4
```

Verificar:

```text
python3 src/verifier/verify_package.py \
  --package data/tampered/camera-001-20260615T210000Z-segment-modified \
  --public-key keys/device_public.pem \
  --registry data/anchor/anchor_registry.json \
  --report reports/tampered_report.json
```

Resultado esperado:

```text
status: INVALIDO
checksum divergente
hash do segmento divergente
```

## Estado atual

O MVP local ja demonstra:

- segmentacao de video;
- geracao de hashes;
- manifesto com encadeamento;
- assinatura do manifesto;
- pacote BagIt minimo;
- validacao por gateway;
- ancoragem local;
- verificacao independente;
- deteccao de adulteracao em segmento.

## Proxima etapa

Executar a mesma ancoragem na Sepolia usando o contrato `CftvCustodyAnchor`.

