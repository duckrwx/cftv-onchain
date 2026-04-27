# Audit

## Slither Audit Summary

Date: 2026-04-27
Target: `/root/cftv/cftv-onchain`
Command run: `python3 -m slither .`

### Executive summary
Latest rerun: 25 findings.

Progression so far:
- initial audited run: 31 findings
- after first hardening pass: 28 findings
- after direct fixes applied now: 25 findings

This is a meaningful reduction. The current remaining findings are mostly:
- dependency noise from OpenZeppelin and Chainlink
- one expected low-level ETH transfer warning in `CameraNFT.withdrawFees()`
- one structural governance warning in `SimpleGovernance.executeProposal()`
- architectural hygiene notes like missing interface inheritance

The earlier high-value `CameraNFT.registerCamera()` reentrancy concern remains resolved.

---

## What was fixed in this pass

### 1. Indexed event parameters added in `CameraNFT`
Fixed:
- `TreasuryUpdated(address treasury)` -> `TreasuryUpdated(address indexed treasury)`
- `FeesWithdrawn(address treasury, uint256 amount)` -> `FeesWithdrawn(address indexed treasury, uint256 amount)`

Effect:
- removed `unindexed-event-address` findings
- improved event filtering/observability

### 2. `SimpleGovernance.votingPeriod` changed to immutable
Fixed:
- `uint256 public votingPeriod` -> `uint256 public immutable votingPeriod`

Effect:
- removed `immutable-states` finding
- better expresses protocol intent

### 3. `withdrawFees()` returned to modern safe pattern
Changed back from `transfer()` to:
- `call{value: amount}("")`
- success check
- `nonReentrant`

Effect:
- avoids the fragile old `transfer()` posture
- removed the previous `reentrancy-unlimited-gas` style concern from the last rerun
- Slither still flags `low-level-calls`, which is expected and acceptable here

---

## Current remaining relevant findings

## 1. Low-level call in `CameraNFT.withdrawFees()`
Slither still flags:
- `(bool ok, ) = payable(treasury).call{value: amount}("")`

Assessment:
- This is expected.
- Slither flags low-level calls structurally, even when they are intentional.
- In the current implementation this is acceptable because:
  - caller is restricted to `treasury`
  - success is checked
  - function is protected by `nonReentrant`

Recommendation:
- Keep as-is unless protocol requirements change.
- Document that treasury can be EOA or trusted contract.

Priority: Acceptable / Low

---

## 2. Reentrancy-events in `SimpleGovernance.executeProposal()`
Slither still flags:
- external call to `cameraNFT.setRegistrationFee(...)`
- `ProposalExecuted(...)` emitted after that call

Assessment:
- This is structural, not currently the strongest risk in the system.
- The target is a controlled protocol contract, not arbitrary attacker-controlled logic in the intended architecture.

Recommendation:
- Can be accepted for now.
- Revisit if governance becomes more powerful or if cross-contract execution expands.

Priority: Medium-Low

---

## 3. `PriceOracle.getLatestPrice()` unused-return warning
Slither still flags ignored tuple fields from Chainlink `latestRoundData()`.

Assessment:
- The current implementation is already better than before because it checks:
  - invalid feed address
  - negative/zero price
  - stale price data
- The warning is mostly about unused tuple values, not necessarily a live exploit.

Recommendation:
- Can be accepted for now.
- If production hardening continues, consider explicit round completeness validation.

Priority: Low-Medium

---

## 4. Missing inheritance notes
Slither still suggests:
- `CameraNFT` should inherit from `ICameraNFT`
- `CameraNFT` should inherit from `ICameraFeeController`

Assessment:
- This is architecture/interface hygiene, not a vulnerability.

Recommendation:
- Optional improvement only.

Priority: Low

---

## 5. Timestamp warnings
Slither still reports timestamp-related warnings in:
- `CustodyLedger`
- `PriceOracle`
- `SimpleGovernance`

Assessment:
- These are partly heuristic.
- Governance deadlines and staleness windows naturally use timestamps.
- No immediate exploit is implied by the warning alone.

Recommendation:
- Keep, but document the assumption that modest timestamp drift is acceptable.

Priority: Contextual / mostly acceptable

---

## Dependency findings that remain noisy
Still reported from imported dependencies:
- `incorrect-exp`
- `divide-before-multiply`
- `assembly`
- mixed pragma versions
- broad solc-version advisories

Assessment:
- Treat as dependency/tooling noise unless independently validated as applicable.

---

## Current conclusion
The codebase is now in a substantially better state than the first Slither pass.

Net improvement:
- 31 -> 25 findings
- primary `CameraNFT` interaction-order concern resolved
- event indexing improved
- governance state immutability improved
- ETH withdrawal path now uses the more modern and acceptable pattern

If I were gating this stage, I would say:
- the important findings have been reduced meaningfully
- the remaining findings are mostly acceptable, explainable, or lower-priority
- the next best step is not another cosmetic Slither chase, but focused manual review of the few remaining cross-contract assumptions

## Suggested next command
```bash
cd /root/cftv/cftv-onchain
python3 -m slither . | tee audit/slither-latest.txt
```
