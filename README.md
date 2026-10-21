# Support Desk

A support ticket triage app built with Next.js. It provides an LLM-based ticket workflow, an optional hosted decision-rules engine, a support chat, smoke testing, and a protected run-history page.

## Features

- **Ticket intake:** Triage V2 validates the ticket request and result with Zod. The LLM returns a category, priority, summary, and suggested action, along with token usage when available.
- **Decision model:** Triage V2 can use a hosted DecisionRules decision table to classify category and priority. The app derives boolean signals on the server and sends only those signals to DecisionRules. Summary and suggested action are fixed templates for this engine.
- **Model comparison:** Choose among configured LLM models, or compare the LLM engine with DecisionRules using the same sample in the smoke test runner.
- **Smoke tests:** Sample tickets from the labelled 100-ticket dataset or the unlabelled 500-ticket dataset. Labelled runs compare predicted category and priority with the dataset labels and report accuracy and mismatches.
- **Run history:** `/admin` shows saved runs, including accuracy, outcome counts, latency, cost estimate, and model/engine. Runs are stored in SQLite.
- **Support chat:** A separate chat workflow powered by the configured LLM.
- **Ticket triage V1:** The original triage exercise remains available alongside Triage V2.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Home and workflow navigation |
| `/triage-v2` | Structured triage with selectable LLM or DecisionRules engine |
| `/triage` | Original ticket triage workflow |
| `/chat` | Support chat |
| `/smoke-test` | Run and compare ticket samples |
| `/admin` | Protected smoke-test run history |

## Requirements

- Node.js 22.5 or newer (the run-history database uses Node's built-in SQLite support).
- An API key and model from an OpenAI-compatible LLM provider for chat, LLM triage, and LLM smoke tests.
- Optional: a DecisionRules account, a published rule, and a Solver API key to use the hosted decision model.

## Configuration

Copy `.env.example` to `.env.local` and configure the LLM provider:

```env
LLM_BASE_URL=https://your-provider.example/v1
LLM_API_KEY=your-api-key
LLM_MODEL=your-default-model
LLM_MODELS=your-default-model,another-model
```

All listed LLM models must be available from the configured base URL and API key. `LLM_MODELS` is optional if only one model is used.

### Admin password

For the purposes of this assignment, the admin password is **`1234`**. Set the following in `.env.local`, then restart the app:

```env
ADMIN_PASSWORD=1234
```

After logging in at `/admin`, the app sets an HTTP-only session cookie that expires after eight hours.

### LLM cost estimates

Set per-model rates to show estimated smoke-test cost. Rates are USD per one million tokens:

```env
LLM_MODEL_PRICING_JSON={"your-default-model":{"inputPer1MUsd":1,"outputPer1MUsd":3}}
```

Cost appears as unavailable when token usage or rates are missing. The SQLite file defaults to `data/smoke-test-runs.sqlite`; override it with `SMOKE_TEST_DB_PATH` if needed.

### DecisionRules setup (optional)

Create and publish the support-ticket decision table described in [`MDM-report.md`](./MDM-report.md). Configure its server-side credentials in `.env.local`:

```env
DECISIONRULES_API_KEY=your-solver-api-key
DECISIONRULES_RULE_ID=your-published-rule-id-or-alias
DECISIONRULES_RULE_VERSION=1
DECISIONRULES_BASE_URL=https://api.decisionrules.io
```

The rule version is optional and defaults to the latest published version. Set the base URL to the appropriate regional API URL for regional accounts. The DecisionRules free plan currently lists 1,000 Solver API calls per month; the app estimates DecisionRules run cost as zero only within that included quota. Check your account usage before running repeated or large samples. The app does not currently retrieve remaining quota from DecisionRules.

## Run locally

```sh
npm install
npm run dev
```

Open [http://localhost:3033](http://localhost:3033). Both `npm run dev` and `npm run start` use port 3033.

## Datasets

The `data/` directory contains:

- [`support_tickets_100_labelled.json`](./data/support_tickets_100_labelled.json) and its CSV counterpart, with category, priority, and human-review labels for evaluation.
- [`support_tickets_500.json`](./data/support_tickets_500.json) and its CSV counterpart, an unlabelled set for exploratory smoke tests.

## Decision-model comparison status

The app supports same-sample comparison between an LLM and DecisionRules. Actual DecisionRules accuracy and latency depend on the rule configured in your account. They are not reported as measured until the API key and rule ID are configured and a labelled smoke test has been run. The evaluation procedure and results table are in [`MDM-report.md`](./MDM-report.md).

## Checks

```sh
npm run typecheck
npm run build
```
