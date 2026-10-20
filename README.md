# Support ticket triage app

This repository is the starting point for an educational project in which
computer science students will build a support ticket triage application. The
planned application will use a large language model (LLM) from the backend to
help analyze incoming support requests and support the triage process.

The codebase is intentionally a basic skeleton. It provides a small chat
interface and server endpoint as a first step: before building the full triage
workflow, students can use this mock chat to validate the connection between
the application and an LLM provider.

## Current status

The chat feature is currently a mockup implemented as an echo service. The
client sends a message to `/api/chat`, and the server returns it in a
confirmation response. No LLM provider is called, and no LLM configuration is
needed to run this version.

This simple end-to-end flow is intended to make it possible to verify the
application's client-to-backend connection first, then integrate and validate
an LLM provider as an intermediate step, before implementing the complete
support ticket triage feature. The triage route and LLM client are placeholders
for that future work.

## Sample data

The `data/` folder contains two support-ticket datasets:

- **500 unlabelled tickets** in
  [`support_tickets_500.csv`](./data/support_tickets_500.csv) and
  [`support_tickets_500.json`](./data/support_tickets_500.json), for exploring
  and developing the triage workflow.
- **100 labelled tickets** in
  [`support_tickets_100_labelled.csv`](./data/support_tickets_100_labelled.csv)
  and
  [`support_tickets_100_labelled.json`](./data/support_tickets_100_labelled.json).
  These include triage annotations such as category, priority, and whether a
  ticket needs human review, making them useful for testing and evaluating
  triage approaches.

## Run locally

Requires Node.js 22.5 or newer.

To enable model selection, configure `LLM_MODEL` as the default model and set
`LLM_MODELS` to the comma-separated model IDs available from the configured
provider, for example `LLM_MODELS=model-a,model-b`. The model menu appears in
Triage V2 and the smoke test runner. Smoke test runs can be repeated against the
same sampled tickets with another model; `/admin` groups those runs for a
side-by-side comparison. All listed models must be available through the same
`LLM_BASE_URL` and API key.

For estimated cost logging, set `LLM_MODEL_PRICING_JSON` to a JSON object keyed
by model ID, with `inputPer1MUsd` and `outputPer1MUsd` prices. Cost is shown as
unavailable for models without a configured rate or runs with missing token
usage.

```sh
npm install
npm run dev
```

Open http://localhost:3033 and send a message. Both `npm run dev` and
`npm run start` use port 3033.

The Send button is disabled when the message is empty or contains only spaces,
and while a request is in progress.

The client posts `{ "message": "your text" }` to `/api/chat`. The App Router
handler in `app/api/chat/route.ts` returns
`{ "answer": "Hello, you just said: your text" }`. Invalid JSON or an
empty/non-string message returns HTTP 400 with an `error`.

## Checks

```sh
npm run typecheck
npm run build
```
