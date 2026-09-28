# Docs

| Doc | Purpose |
| --- | --- |
| [product-research.md](product-research.md) | Evidence log from reviewing the reference platform. Everything is `NOT YET VERIFIED` until observed. |
| [architecture/multi-tenancy.md](architecture/multi-tenancy.md) | Org → branch tenancy model, roles, enforcement. |
| [architecture/auth.md](architecture/auth.md) | Firebase Auth + session-cookie flow. |
| [adr/](adr/) | Architecture decision records. |

## Build-order rule

Dashboard, appointments, POS and CRM screens are **not** to be designed until
the relevant sections of `product-research.md` are verified.
