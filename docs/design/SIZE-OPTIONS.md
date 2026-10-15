# Add size — editable clothing option defaults

15 October 2026, RTL-070. Add a size to the same colour using that colour's most recent current row. Copy its editable price, unit cost and opening units exactly; give the option a fresh identity/SKU, keep all existing options and focus the new size input. These are convenient editable defaults, not observed stock or measured fit. Save applies only through normal catalogue validation or owner review/confirm. Cancel discards the addition.

- Alphabetic: XXS → XS → S → M → L → XL → XXL → XXXL; preserve numeric extended style such as 2XL → 3XL. Supported bounded extensions stop with an empty editable label.
- Waist/inseam: 32/32 → 34/32. Keep the current inseam and label style; infer a consistent positive waist interval from prior same-colour sizes, normally two. Support W32 L32 and equivalent clear waist/leg notation.
- Numeric regional/chest labels: follow the last positive consistent interval, such as 36, 38 → 40 or UK 8, UK 10 → UK 12; preserve prefix/suffix and chest-length letter. Known numeric conventions can use two when no interval exists. A convention or label that is ambiguous remains blank.
- Recognizable child labels may follow their own bounded T/Y sequence. Mixed alpha ranges, arbitrary labels, One Size/OS and unsupported patterns remain blank. Every suggestion remains editable; no chart/provider/measurement lookup occurs.
- Check all current same-colour rows and skip occupied labels. Different colours may share a size; do not copy an entire colour matrix or silently add inventory to existing variants. Keep the established 24-option/product and 288-option/draft envelopes and original stock-edit rules.

Existing manual price/cost/stock/colour edits must be the source of the new defaults. Colour renaming applies to added rows as well as originals; save retains actual colour-photo mapping. Newly added review rows can be removed before save. Owner forms retain their existing remove/archive/history rules. No free-form sizing taxonomy migration, processing-on-upload change or live-AI sizing claim.
