# WAY CS Dashboard V2 — Roster & Identity Change Set

**Date:** 17 Aug 2026
**Jira:** _(add ticket ref before merge — production reporting surface)_
**Scope:** agent identity resolution, roster model, and the display artefacts that followed from them.

Verified: `tsc --noEmit` clean, `vite build` green, 35/35 identity resolution cases pass.

---

## 1. Identity model inverted — roster is now canonical

**Was:** the CCDR export name was canonical *by definition*. Aliases only flowed CRM → CCDR, and `CCDR_TO_CANONICAL` was an empty stub. A corrupted name on the CCDR side had nowhere to go.

**Now:** the **roster name** is canonical. Both CCDR and CRM variants resolve into it.

This is the root fix for the split agent cards. Previously `computeAgentSummaries` built its agent list from the *union* of CCDR names and CRM names, so two non-identical strings for one person became two cards — one holding the calls, one holding the emails.

Confirmed merges:

| CCDR form | CRM form | Resolves to |
|---|---|---|
| `Varghese, Ajesh (*)` | `Ajesh Varghese` | **Ajesh Varghese** |
| `Khan, Javed Humayun` | `Javed Khan` | **Javed Khan** |
| `V, Aswin A.` | `Aswin A.V` | **Aswin AV** |
| `J R, Ananthu` | `Ananthu JR` / `Ananthu` | **Ananthu J R** |

`Ajesh Varghese` and `Ajesh Mathew Varghese` remain **separate people** — verified explicitly.

### Resolution order
1. Exact match on a normalised key (lowercased, punctuation stripped, whitespace collapsed) — so `(*)` markers, `A.V`, and case variants resolve with no alias needed.
2. Compact-key fallback (all spaces removed) — handles initial spacing generically, e.g. `aswin a v` = `aswin av`.
3. Otherwise **unrostered**.

### Two ambiguity guards
- **First-name aliases are explicit only, never inferred.** A bare `Jonathan` resolves to *nothing*, so Jonathan Brown's activity can never be credited to Jonathan Anil.
- **Compact keys are collision-checked.** Any compact form claimed by two different roster names is discarded rather than guessed, and logs a warning.

### Bugs found in the old alias map
Two entries pointed the wrong way — mapping *away* from your roster spelling, so those agents' CRM rows would resolve to a name not on the allowlist and be dropped:
- `'Amal Krishna A' → 'Amal Krishna'` (now `Amal Krishna` → `Amal Krishna A`)
- `'Arya J S' → 'Arya JS'` (now `Arya JS` → `Arya J S`)

---

## 2. Blacklist → allowlist

`EXCLUDED_AGENTS` is deprecated (kept as an empty set so nothing breaks on import). Roster membership is now explicit in `engines/roster.ts`: **34 English + 9 Spanish**.

Under the blacklist, anyone *not* listed counted as frontline — which is how Esther Cleetus, Fazal Sherrif, Rahul Vinod, shijith and Jonathan Brown acquired agent cards. They are now excluded automatically, with no per-name entry required.

**Unrostered panel** added to the home page. Names present in the data but not on the roster are surfaced, split into *Known non-CS* (expected) and *Unknown* (needs a decision — either a new joiner or an unmapped variant that is silently under-counting a rostered agent). Nothing is silently dropped.

---

## 3. Spanish queue scoped out of the baseline

The 9 Spanish agents are rostered and carry `queueScope: 'Spanish'`, tagged **ES** on their card. They get full individual and QC pages, but are held out of team aggregates and peer benchmarking.

Home page gains a **Queue** selector — English (default) / Spanish / All. Headline tiles recompute on the selected scope, so the English baseline is not distorted by a different handling profile.

---

## 4. Display artefacts corrected

These were all arithmetic artefacts, not performance results.

**FCR 0% → n/a.** `fcrTotal` fell back to `1` when an agent had no FCR-eligible CRM rows, producing `0/1` = a red 0%. Now gated on `fcrAvailable`. Also: team Avg FCR averages over agents *with* data only — counting n/a agents as 0 dragged the team figure down. Coverage % shown as a subtitle.

**Utilisation 100% on an email-only card.** `days` was derived from **CCDR call dates only**. An agent with 138 emails and no calls got `days = 1`, so 828 occupied minutes over a single 480-minute day capped at 100%. `dates` is now the **union of call dates and CRM ticket dates**.

> ⚠️ This changes utilisation and per-day productivity for any agent with email/chat activity on days they took no calls. It is a correction, but numbers **will** move against previously reported figures. Worth a note wherever this is cited.

**Tickets tile added** to the agent card. Tickets (×1.5 min) and escalations (×3 min) feed utilisation, so a card could read 0 calls / 0 emails / 0 chats and still show 1–6% utilisation. The inputs are now visible. *Formula deliberately unchanged.*

---

## 5. Deliberately NOT changed — needs your sign-off

These alter metric *definitions*, so they would break week-over-week comparability with numbers already reported. Flagged, not touched:

1. **FCR is scoped per-agent.** An OGI counts as resolved for Agent A even if the customer called back and Agent B handled it. Your canonical definition (Waypanel, Decagon) is OGI-level across all interactions. Current version reads materially **higher** than the true rate.
2. **The P3 matcher fallback (`agent + date`, closest by time)** is very loose. On a 60-call day nearly every unmatched call attaches to *something*, so `crmMatchFound` is near-always true and the **Missing Ticket Logging view in Tab 4 is close to non-functional**.
3. **Utilisation counts talk time only** — no hold, no wrap. Your established definition is AHT = Talk + Hold + Wrap. Occupancy is understated.
4. **Handling-time constants are hardcoded** (email 6 min, chat 4, escalation 3, ticket 1.5) against a flat 480-minute day, with no shift-length, half-day or leave awareness.
5. **Jonathan Anil renders at zero** per your instruction. Consequence: he shows "Below Target" with coaching flags, since the verdict is derived. A two-line guard could suppress the verdict for zero-interaction agents if you want it.

---

## 6. Deploy — check this first

The live site may be serving **raw source rather than the build**. Repo-root `index.html` points at `/src/main.tsx`, which only works in dev. If **Settings → Pages → Source** is "Deploy from a branch" rather than **GitHub Actions**, the page renders blank regardless of these changes. `.github/workflows/deploy.yml` is correct and builds to `dist`.

Also: the project is committed **three times** — repo root, `way-cs-dashboard/`, and `way-cs-dashboard-v2/way-cs-dashboard/` — plus `node_modules` is committed. Only the **root** copy is what the workflow builds. **Apply these files to the root copy.** Recommend deleting the two nested duplicates and adding a `.gitignore` for `node_modules` separately.

Secret scan: clean, nothing hardcoded.

---

## Files changed

| File | Change |
|---|---|
| `src/engines/roster.ts` | **NEW** — roster allowlist, aliases, resolution, ambiguity guards |
| `src/engines/agentNameMap.ts` | Reduced to a compatibility layer over `roster.ts` |
| `src/engines/fileParser.ts` | Strips `(*)`; resolves both sources via roster; retains unrostered rows; removed the brittle inline `.replace()` |
| `src/engines/metrics.ts` | Allowlist filtering; `days` union fix; `fcrAvailable`; `computeUnrostered()`; `teamBaseline()` |
| `src/types/index.ts` | `queueScope`, `rostered`, `rawAgentName`, `fcrAvailable`, `UnrosteredAgent`; deprecated `EXCLUDED_AGENTS` |
| `src/App.tsx` | Wires unrostered data to the home page |
| `src/components/home/HomePage.tsx` | Queue selector, tickets tile, FCR n/a, ES tag, unrostered panel, scoped totals |
| `src/components/agent/AgentDashboard.tsx` | FCR n/a chip |
| `src/components/agent/Tab1IndividualPerformance.tsx` | FCR n/a stat + omitted from target chart when unavailable |

**Adding an agent later:** add the name to `ENGLISH_ROSTER` or `SPANISH_ROSTER` in `roster.ts`. Add export variants to `ALIASES`. Nothing else needs touching.
