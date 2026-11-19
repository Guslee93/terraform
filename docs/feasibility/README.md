# Terraform feasibility investigation (2026-11-15)

Baseline: `2089fd4` = production (tag `pre-feasibility`, local). Branch `feasibility/audit`, not pushed. Production code untouched.

| File | Contents |
|---|---|
| [07_DECISION_BRIEF.md](07_DECISION_BRIEF.md) | **Start here.** What to build, delay, stop; three unknowns |
| [01_REPO_AUDIT.md](01_REPO_AUDIT.md) | What the code actually does; baseline; doc drift |
| [02_DATA_SOURCE_REGISTER.md](02_DATA_SOURCE_REGISTER.md) | Every source, tested live at the Oslo site, with licence and CORS |
| [03_FEASIBILITY_MATRIX.md](03_FEASIBILITY_MATRIX.md) | Seven modules × basic/advanced, scores, GO/CONDITIONAL/NO-GO |
| [04_POC_TEST_RESULTS.md](04_POC_TEST_RESULTS.md) | Reproducible commands, numbers, failures, what was not run |
| [05_ARCHITECTURE_AND_COST.md](05_ARCHITECTURE_AND_COST.md) | Browser vs backend split; USD 50/month scenarios |
| [06_RECOMMENDED_ROADMAP.md](06_RECOMMENDED_ROADMAP.md) | Phased plan with proof gates; stop list |
| [08_RISK_REGISTER.md](08_RISK_REGISTER.md) | Scientific, regulatory and liability risks; output classes |
| [09_FOUNDATION_VERIFICATION.md](09_FOUNDATION_VERIFICATION.md) | 3D registration proof, official noise as replacement, building heights, verified licences, label review |

Scratch code and raw evidence: [`feasibility/scratch/`](../../feasibility/scratch/) (Python venv, DTM/DOM tiles and `.venv` are git-ignored).
