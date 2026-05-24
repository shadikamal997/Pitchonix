# PPTX fixture drop directory

Drop real `.pptx` / `.potx` files here. They become part of the certification +
visual-regression suites automatically.

## Naming

Prefix the filename with the deck kind so reports group nicely:

```
investor-acme.pptx
sales-q4-deck.pptx
consulting-redacted-engagement.pptx
corporate-allhands-2026q1.pptx
financial-board-meeting.pptx
training-onboarding.pptx
healthcare-protocol.pptx
government-budget.pptx
enterprise-saas-rfp.pptx
productLaunch-atlas.pptx
```

Anything that doesn't match a known prefix is tagged `other`.

## Run the batch certification

```bash
npx ts-node --transpile-only scripts/certify-fixtures.ts
```

Output:

* per-fixture certification score (import + export + round-trip + visual)
* aggregate average + band histogram
* CSV at `scripts/fixtures-pptx/.results.csv` for spreadsheet analysis

## Privacy

These files never leave your machine unless you commit them. The drop
directory is `.gitignore`-friendly — keep customer decks out of git by
adding a top-level `.gitignore` entry:

```
backend/scripts/fixtures-pptx/*.pptx
backend/scripts/fixtures-pptx/*.potx
backend/scripts/fixtures-pptx/.results.csv
```

## Why no decks are committed

Real customer decks have IP / licence / confidentiality concerns that make
them unsafe to ship in a public repo. The synthetic golden suite at
`backend/src/pptx-import/golden-fixtures.ts` provides 10 archetype decks for
deterministic CI; this drop directory is the customer-owned counterpart.
