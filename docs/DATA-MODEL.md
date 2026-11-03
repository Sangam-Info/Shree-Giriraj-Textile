# Firestore data model — mapped from the prototype

All amounts are stored as integers: **money in paise**, **weight in grams**. The app
converts to/from BigInt for exact arithmetic (no floating-point drift).

| Collection | Doc ID | Fields | Role access |
|---|---|---|---|
| `users` | auth UID | `name`, `role` (`admin`\|`supervisor`), `active` | read self/admin; write admin |
| `meta` | `settings` | `company{name,nameGuj,tag,place,gstin,phone}`, `vendor`, `months[]` | read staff; write admin |
| `workers` | workerId | `name`, `en`, `phone`, `cloth`, `rateP` | read staff; write admin |
| `sheets` | sheetId | `workerId`, `date`, `quality`, `nSteps`, `meters[step][row]`, `kgG[step]`, `parat[{kokdiG,colorG}]` | read/write staff |
| `packing` | packId | `name`, `date`, `quality`, `city`, `transport`, `nSteps`, `meters`, `kgG`, `basis`, `rateP`, `packingP`, `taxP` | read/write staff |
| `niwarParties` | partyId | `name`, `en`, `phone` | read staff; write admin |
| `niwarSheets` | sheetId | `partyId`, `date`, `products[{size,kgG}]`, `parat` | read/write staff |
| `niwarParams` | `{partyId}_{YYYY-MM}` | per-size `rates`, `yarnPriceP`, `ghat`, `tdsPct`, `materialCarryG` | read/write **admin** |
| `bills` | `{workerId}_{YYYY-MM}` | `rateP`, `transportP`, `loanP`, `paidP` | read/write **admin** |
| `loans/{workerId}/entries` | auto | `d`(date), `type`(`loan`\|`repay`\|`topup`), `amtP`, `note` | read/write **admin** |
| `upad/{workerId}/entries` | auto | `d`, `amtP`, `note` | read/write **admin** |
| `niwarUpad/{partyId}/entries` | auto | `d`, `amtP`, `note` | read/write **admin** |
| `niwarLoans/{partyId}/entries` | auto | `d`, `type`, `amtP`, `note` | read/write **admin** |

## Prototype store → collection
| Prototype (in-memory) | Firestore |
|---|---|
| `WORKERS` | `workers` |
| `SHEETS` | `sheets` (the single source of truth) |
| `PACKING` | `packing` |
| `BILL[worker][month]` | `bills/{workerId}_{month}` |
| `LOANS[worker]` | `loans/{workerId}/entries` |
| `UPAD[worker][month]` | `upad/{workerId}/entries` |
| `NWORKERS` | `niwarParties` |
| `NSHEETS` | `niwarSheets` |
| `NPARAM` | `niwarParams` |
| `NUPAD` / `NLOANS` | `niwarUpad` / `niwarLoans` |
| `CO` (company), `MONTHS` | `meta/settings` |

## Migration notes
- Keep field names suffixed `P` (paise) / `G` (grams) so the integer units are explicit.
- The gate **sheet** writes drive the ledger/billing; keep sheets authoritative and derive
  ledger/bill views on read (as the prototype already does) rather than duplicating totals.
- `db.js` exposes `window.GJDB` with `loadWorkers/saveSheet/loadPacking/...`; Phase 2 replaces
  the prototype's array mutations with these calls, loading on login and writing on save.
