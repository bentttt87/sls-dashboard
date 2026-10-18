# SLS Inventory Health Logic

This file records the agreed inventory-health logic used by SLS Control Tower during the manual-transition period.

## Official DOI
- Current Stock basis: Physical Inventory / On Hand.
- Avg Sales Official: rolling average of the latest 3 full months.
- Avg Sales 6M: stability check only.
- Last Year: benchmark / seasonality check only, not the primary DOI denominator.
- DOI Months = Current Physical Stock / Avg Sales 3M.
- DOI Days = DOI Months x 30.

## Inventory Health
- Healthy / Maintain: DOI within target and demand is moving.
- Overstock / Hold PR / Reduce: sales still exist, but stock is above target.
- No Movement 3M = Deadstock Candidate:
  - Physical Inventory > 0
  - no positive sales/outbound in the latest rolling 3 months.
- No Movement 6M = Strong Deadstock Candidate:
  - Physical Inventory > 0
  - no positive sales/outbound in the latest rolling 6 months.
- Deadstock is not defined only by high DOI.

## Recovery / Recommended Action
Target Stock = MAX(Avg Sales 3M x 2 months, 20 box).

Priority of action:
1. Maintain required stock.
2. Transfer to another RDC if the same SKU has shortage/demand there.
3. Hold PR / Reduce local stock for remaining excess.
4. Flush Out Candidate only after transfer opportunity is exhausted and the SKU has no meaningful national demand.
5. Replenish / PR when stock + OTS PO is below required target.

Transfer / flush-out action quantity must not exceed Free Stock; reserved stock is not treated as freely transferable.

## Dashboard presentation
- Dead Stock Qty may be shown from manual PR Reference uploads.
- Dead Stock Candidate = No Movement 3M.
- Strong Candidate = No Movement 6M.
- Dead Stock Value (Rp) remains DATA REQUIRED until standard/unit cost per SKU is available.
- Source status during transition = MANUAL.
- Future authoritative source: SAP/TMS monthly sales/outbound + WMS physical stock.
