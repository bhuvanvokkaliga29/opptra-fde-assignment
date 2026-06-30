# Opptra Discount Engine

FDE Intern Assignment - complete working prototype.

**Live deployment:** Add your Vercel/Netlify URL here after deployment.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, upload `sample-data/rules.csv` and `sample-data/cart.csv`, then click **Calculate Discounts**.

## Implemented

### Foundation - CSV Upload And Engine

- Uploads `rules.csv` and `cart.csv`.
- Applies the best non-stackable item-level discount.
- Applies stackable rules on top of the winning non-stackable rule.
- Matches the expected sample results from the assignment.

### Task 1 - Cart-Level Offer

- Supports `scope=cart` and `min_cart_value` in `rules.csv`.
- Evaluates cart rules after item-level discounts.
- Shows cart discounts as a separate line, for example `Cart offer: 10% off - Rs.593 saved`.
- Hides the cart offer row when the threshold is not met.

### Task 2 - Plain-English Rule Input

- Supports two parsing modes:
  - **Gemini LLM** — when an API key is provided, uses Gemini 2.0 Flash to parse any natural-language rule description into a structured `DiscountRule`.
  - **Local regex parser** — deterministic fallback that works without an API key for common rule patterns.
- Shows a confirmation step before adding the parsed rule, with a badge indicating which parser was used (`✦ Gemini` or `⚙ Local`).
- Validates all LLM output fields before use — invalid responses surface clear errors instead of crashing.
- Handles ambiguous input (e.g. "Give a discount for big orders") with a descriptive error.
- Re-runs the engine immediately after a confirmed rule is added.

Example supported inputs:

- `20% off for Natura Casa brand, stackable`
- `Rs.100 flat discount on all Flipkart items`
- `10% off if cart value is more than Rs.5000`

### Task 3 - PDF Cart Upload

- Adds a PDF upload tab for cart input.
- Uses `pdfjs-dist` in the browser to extract table text.
- Maps PDF rows to `CartItem` objects with `Product`, `Brand`, `Platform`, and `Base Price`.
- Skips malformed rows with row-level errors instead of rejecting the whole PDF.
- Re-runs the engine automatically after a valid PDF cart is loaded.

## Expected Sample Output

With `sample-data/rules.csv` and `sample-data/cart.csv`:

| Item | Final Price | Applied Rule(s) |
| --- | ---: | --- |
| ITEM-01 | Rs.1,104 | RULE-01 |
| ITEM-02 | Rs.629 | RULE-02 + RULE-03 |
| ITEM-03 | Rs.509 | RULE-01 |
| ITEM-04 | Rs.2,499 | No offers available |
| ITEM-05 | Rs.382 | RULE-01 |
| ITEM-06 | Rs.809 | RULE-03 |

Item subtotal: `Rs.5,932`

Cart offer: `Rs.593`

Final cart total: `Rs.5,339`

## Design Decisions

**Input adapters stay separate from the engine.** CSV parsing, PDF parsing, and plain-English rule parsing all convert input into the same `DiscountRule` or `CartItem` shapes before calling the engine.

**PDF parsing runs client-side.** `pdfjs-dist` avoids adding a backend. The parser groups text by y-position, finds the table header, and maps values by column x-position.

**Plain-English parsing uses Gemini LLM with a local fallback.** When a Gemini API key is provided in the UI, the app calls Gemini 2.0 Flash for flexible natural-language parsing. Without a key, a deterministic regex parser handles the common rule formats. This dual approach ensures the deployed static app works for evaluators both with and without an API key. The API key is held in React state only — never persisted or sent anywhere except Google's Gemini API.

## Project Structure

```text
src/
  engine/
    discountEngine.js   pure discount logic
    csvParser.js        CSV to typed objects
    nlRuleParser.js     local regex rule parser (fallback)
    geminiParser.js     Gemini LLM rule parser
    pdfParser.js        PDF to CartItem[]
  components/
    CsvUploader.jsx
    DataTable.jsx
    ErrorBanner.jsx
  App.jsx
  main.jsx

sample-data/
  rules.csv
  cart.csv
```

## Deploy

```bash
npm run build
```

Deploy the generated `dist/` folder to Vercel, Netlify, or another static host. After deploying, replace the live deployment placeholder at the top of this README with your URL.
