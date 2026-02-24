# NL Test Cases (MVP)

Reference PRD: `/root/.openclaw/workspace/budgeting-app/PRD.md`

## Test assumptions
- **Reference "now"** for relative dates: **2026-02-24 12:42 Asia/Manila**.
- Default currency: **PHP**.
- Expected parser output fields follow PRD contract:
  - `amount`, `currency`, `merchant`, `date`, `category`, `note`, `confidence`, `needs_review`
- `source` should be `nl` and `raw_input` should preserve the exact user text.
- For ambiguous/refund/transfer/income cases, expected behavior is `needs_review=true`.

## Suggested category set for evaluation
Food & Dining, Groceries, Transportation, Shopping, Utilities, Health, Entertainment, Education, Travel, Bills & Fees, Personal Care, Transfer, Income, Miscellaneous.

## Cases

| ID | NL input | amount | currency | merchant | date (YYYY-MM-DD) | expected category | note | confidence | needs_review |
|---|---|---:|---|---|---|---|---|---:|---|
| TC-01 | GrabFood 289 dinner last night | 289 | PHP | GrabFood | 2026-02-23 | Food & Dining | dinner | 0.93 | false |
| TC-02 | Spent 430 at Uniqlo for socks yesterday | 430 | PHP | Uniqlo | 2026-02-23 | Shopping | socks | 0.91 | false |
| TC-03 | Angkas 95 to BGC this morning | 95 | PHP | Angkas | 2026-02-24 | Transportation | to BGC | 0.92 | false |
| TC-04 | SM Supermarket 1245 groceries today | 1245 | PHP | SM Supermarket | 2026-02-24 | Groceries | groceries | 0.95 | false |
| TC-05 | Paid Meralco 3870 electric bill today | 3870 | PHP | Meralco | 2026-02-24 | Utilities | electric bill | 0.94 | false |
| TC-06 | Netflix 549 subscription Feb 20 | 549 | PHP | Netflix | 2026-02-20 | Entertainment | monthly subscription | 0.94 | false |
| TC-07 | Mercury Drug 620 paracetamol and vitamins last Friday | 620 | PHP | Mercury Drug | 2026-02-20 | Health | paracetamol and vitamins | 0.90 | false |
| TC-08 | Shell 2100 gas full tank Monday | 2100 | PHP | Shell | 2026-02-23 | Transportation | full tank | 0.88 | false |
| TC-09 | Parking 120 at One Ayala yesterday | 120 | PHP | One Ayala Parking | 2026-02-23 | Transportation | parking | 0.84 | false |
| TC-10 | National Book Store 799 planner and pens Feb 1 | 799 | PHP | National Book Store | 2026-02-01 | Education | planner and pens | 0.86 | false |
| TC-11 | PLDT 1899 home fiber Feb 21 | 1899 | PHP | PLDT | 2026-02-21 | Utilities | home fiber | 0.94 | false |
| TC-12 | Cebu Pacific 2450 seat sale flight deposit Feb 12 | 2450 | PHP | Cebu Pacific | 2026-02-12 | Travel | flight deposit | 0.89 | false |
| TC-13 | GCash cash-in fee 25 yesterday | 25 | PHP | GCash | 2026-02-23 | Bills & Fees | cash-in fee | 0.88 | false |
| TC-14 | Lazada 999 phone case and cable today | 999 | PHP | Lazada | 2026-02-24 | Shopping | phone case and cable | 0.93 | false |
| TC-15 | Coffee Bean 185 client meeting today | 185 | PHP | Coffee Bean | 2026-02-24 | Food & Dining | client meeting | 0.85 | false |
| TC-16 | Spent 150 for parking yesterday | 150 | PHP |  | 2026-02-23 | Transportation | parking | 0.52 | true |
| TC-17 | Paid around 300-ish for tricycle fare this morning | 300 | PHP |  | 2026-02-24 | Transportation | tricycle fare (approximate amount) | 0.49 | true |
| TC-18 | Jollibee 250 or 280 dinner last night | 280 | PHP | Jollibee | 2026-02-23 | Food & Dining | dinner (amount ambiguous: 250 or 280) | 0.42 | true |
| TC-19 | SM groceries 1.2k kahapon | 1200 | PHP | SM | 2026-02-23 | Groceries | groceries | 0.79 | false |
| TC-20 | Load 99 for Smart yesterday | 99 | PHP | Smart | 2026-02-23 | Utilities | prepaid load | 0.86 | false |
| TC-21 | SM Hypermarket 1450 groceries + 300 meds in one receipt yesterday | 1750 | PHP | SM Hypermarket | 2026-02-23 | Groceries | split purchase: groceries + meds | 0.58 | true |
| TC-22 | Lazada 600 desk lamp + 300 vitamins, total 900 yesterday | 900 | PHP | Lazada | 2026-02-23 | Shopping | split purchase across categories | 0.56 | true |
| TC-23 | Coffee 120/2 with Ana at Starbucks today | 60 | PHP | Starbucks | 2026-02-24 | Food & Dining | split bill (half of 120) | 0.46 | true |
| TC-24 | Refund from GrabFood 289 wrong order yesterday | 289 | PHP | GrabFood | 2026-02-23 | Food & Dining | refund for wrong order | 0.44 | true |
| TC-25 | Meralco refund 1200 posted today | 1200 | PHP | Meralco | 2026-02-24 | Utilities | refund posted | 0.43 | true |
| TC-26 | GCash reversal for duplicate Angkas charge 95 today | 95 | PHP | GCash | 2026-02-24 | Transportation | charge reversal / refund | 0.45 | true |
| TC-27 | Transferred 5000 to Maya savings yesterday | 5000 | PHP | Maya | 2026-02-23 | Transfer | transfer to savings (non-expense) | 0.40 | true |
| TC-28 | Received salary 45000 today | 45000 | PHP | Employer | 2026-02-24 | Income | salary received (non-expense) | 0.39 | true |
| TC-29 | Movie tickets 760 for two at SM Cinema last Sunday | 760 | PHP | SM Cinema | 2026-02-22 | Entertainment | movie tickets for two | 0.90 | false |
| TC-30 | Tuition installment 8000 for nephew Feb 5 | 8000 | PHP |  | 2026-02-05 | Education | tuition installment | 0.63 | true |
| TC-31 | Airbnb downpayment 3500 for Tagaytay trip March 15 | 3500 | PHP | Airbnb | 2026-03-15 | Travel | trip downpayment | 0.73 | false |
| TC-32 | Office snacks 350 cash today | 350 | PHP |  | 2026-02-24 | Food & Dining | office snacks | 0.54 | true |
| TC-33 | Watsons 1050 shampoo sunscreen makeup yesterday | 1050 | PHP | Watsons | 2026-02-23 | Personal Care | shampoo, sunscreen, makeup | 0.88 | false |
| TC-34 | Manila Water 620 bill 02/18 | 620 | PHP | Manila Water | 2026-02-18 | Utilities | water bill | 0.91 | false |
| TC-35 | Grab ride 350 BGC to Pasig 11pm last night | 350 | PHP | Grab | 2026-02-23 | Transportation | BGC to Pasig | 0.90 | false |
| TC-36 | Donated 500 to Red Cross yesterday | 500 | PHP | Red Cross | 2026-02-23 | Miscellaneous | donation | 0.76 | false |

## Quick pass/fail guidance
- **Should auto-save candidate (`needs_review=false`)**: TC-01 to TC-15, TC-19, TC-20, TC-29, TC-31, TC-33 to TC-36.
- **Must force preview review (`needs_review=true`)**: TC-16 to TC-18, TC-21 to TC-28, TC-30, TC-32.
- For refund/transfer/income cases, parser should keep extracted facts but still require explicit user confirmation before save.
