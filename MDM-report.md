# Decision Model Research, Integration, and Comparison

**Research date:** 20 October 2026  
**Selected service:** DecisionRules Public Cloud  
**Model type:** Deterministic business decision table

## 1. Hosted options reviewed

| Hosted option | Free usage and cost basis | Fit for this project |
| --- | --- | --- |
| **DecisionRules Public Cloud** | €0/month Free plan. Includes 10 business rules/flows and **1,000 Solver API calls per month**; one user and one project. Free tier continues after the 14-day Lite trial. | Best fit. It is a hosted business rules engine with an explicit decision table, stable decisions, and a small REST API allowance suitable for sampled ticket evaluation. No model hosting or compute configuration is needed. |
| **Hugging Face Inference Providers** | Free accounts currently receive **$0.10/month** in inference credits, subject to change. Further use requires purchased credits; rates depend on the chosen provider/model. | Good for trying a hosted text classifier, but it is a model inference platform rather than a managed decision table. The small variable credit makes a repeatable 100-ticket evaluation less predictable. |
| **Amazon SageMaker AI** | Free tier includes 125 hours/month of real-time inference or 150,000 seconds/month of serverless inference during the first two months. Usage is metered after that and endpoint setup/deployment is required. | Capable of hosting a trained classifier, but too much infrastructure and billing setup for this small coursework comparison. The free allowance is temporary. |
| **Replicate** | Pay for model runtime or input/output, depending on model; no general recurring free inference allowance is listed on its pricing page. | Convenient for running many open models, but less suitable when the requirement is a free hosted decision model. |

Sources: [DecisionRules Public Cloud pricing](https://www.decisionrules.io/en/pricing/public-cloud/), [DecisionRules Solver API limits](https://docs.decisionrules.io/doc/profile/limits/plan-limits-explained), [Hugging Face Inference Providers pricing](https://huggingface.co/docs/inference-providers/en/pricing), [Amazon SageMaker AI pricing](https://aws.amazon.com/sagemaker/ai/pricing/), and [Replicate pricing](https://replicate.com/pricing/).

### Why DecisionRules was selected

The target is a *decision model*, rather than another generative model. DecisionRules lets us express category and priority policy as visible, ordered table rows; the same inputs produce the same output, and the decision does not consume LLM tokens. Its free plan is an ongoing free tier with a stated call quota, rather than a limited-duration trial. A 100-ticket run costs 100 Solver API calls, or 10% of the plan's stated monthly allowance, if the account has not used that allowance elsewhere.

The service accepts a REST request with `Authorization: Bearer <Solver API Key>` and a JSON `data` object, and returns the matching decision output. The implementation calls the published rule's Solver API, uses `FIRST_MATCH`, and validates the returned category and priority with the app's Zod schema. The adapter derives six boolean signals on the server and sends only those signals; it does not send ticket text or customer contact details to the decision service.

## 2. Model contract and decision table

The app extracts the following boolean inputs from the ticket's subject and body:

| Input | Signal detected |
| --- | --- |
| `isBilling` | Invoice, billing, charge, payment, refund, tax, subscription, renewal, or price language |
| `isAccount` | Login, password, account, access, MFA, or authentication language |
| `isFeatureRequest` | Explicit feature request, add/support request, roadmap, or similar wording |
| `isTechnicalBug` | Error, crash, broken behavior, regression, slowness, or similar wording |
| `isHighUrgency` | Explicit urgency, outage, data loss, security breach, or blocked-work wording |
| `isMediumUrgency` | Degradation, workaround, repeated issue, deadline, or multi-user impact wording |

Create and publish one DecisionRules **decision table** with those six boolean
input columns and two output columns: `category` and `priority`. Use
`FIRST_MATCH`. The decision policy is:

| Category branch (check in order) | Priority branch | Output |
| --- | --- | --- |
| `isBilling = true` | `isHighUrgency = true` | `billing`, `high` |
| `isBilling = true` | high is false, `isMediumUrgency = true` | `billing`, `medium` |
| `isBilling = true` | high and medium are false | `billing`, `low` |
| `isBilling = false`, `isAccount = true` | repeat the three priority branches | `account`, `high/medium/low` |
| `isBilling = false`, `isAccount = false`, `isFeatureRequest = true` | repeat the three priority branches | `feature_request`, `high/medium/low` |
| `isBilling = false`, `isAccount = false`, `isFeatureRequest = false` | repeat the three priority branches | `technical_bug`, `high/medium/low` |

This yields 12 rows. The category precedence is billing, account, feature
request, then technical bug; urgency is evaluated independently. Rows should
be ordered from the most urgent branch to the least urgent branch within each
category branch. For the medium-priority rows, use the condition
`isMediumUrgency = true OR isTechnicalBug = true` while
`isHighUrgency = false`; this treats ordinary reported faults as at least
medium priority. The low-priority rows require all three priority signals to
be false. In the technical/default category branch, `isTechnicalBug` may be
true or false; if billing, account, and feature signals are false, default to
`technical_bug`.

The integration adds short category-specific summary and action text in the
app, because a symbolic decision table returns a category/priority decision,
not natural-language prose. These templates are not presented as model output.

## 3. Integration in the app

The DecisionRules adapter is in `lib/decisionRules.ts`. Triage V2 and the smoke
test runner each have an engine selector. For the selected hosted decision
model, the server:

1. Extracts the six boolean signals from the ticket.
2. Calls `POST {DECISIONRULES_BASE_URL}/rule/solve/{ruleId}/{version}` with the
   Solver API key kept in the server environment.
3. Parses the solver response and checks category/priority with Zod.
4. Returns the common triage result shape, adding fixed, category-specific
   summary and suggested action text.

Configure `DECISIONRULES_API_KEY`, `DECISIONRULES_RULE_ID`, optional
`DECISIONRULES_RULE_VERSION`, and `DECISIONRULES_BASE_URL`. The default base URL
is `https://api.decisionrules.io`; regional accounts must use their regional
API base. No DecisionRules credentials are placed in browser code.

## 4. Results and cost comparison

The app now records LLM and DecisionRules smoke-test runs using the same
dataset, sampled ticket IDs, outcome counts, and latency fields. Choose the
labelled 100-ticket set, run a baseline with one engine, switch the engine,
then use **Compare with ...** to score the identical sample. `/admin` groups
these runs and displays category accuracy, priority accuracy, exact accuracy,
latency, and estimated cost. LLM runs also report tokens; DecisionRules runs do
not have token usage.

**Live comparison status:** not yet measured. This checkout has no
`DECISIONRULES_API_KEY` or `DECISIONRULES_RULE_ID` configured, and a DecisionRules
rule must be created and published in the account before its endpoint can return
predictions. The comparison workflow is implemented, but reporting model
accuracy or latency values without running that hosted rule would be misleading.

| Measure | LLM | DecisionRules |
| --- | --- | --- |
| Category/priority accuracy | Obtain from a labelled-set smoke test; depends on selected model and prompt. | Obtain from the same sampled ticket IDs after configuring and publishing the table. |
| Marginal cost for 100 decisions | Calculated from configured per-model input/output token prices and actual usage, when available. | €0 while within the Free plan's remaining 1,000 monthly Solver API calls; account-level usage may reduce the remaining allowance. |
| Cost beyond the included allowance | Depends on configured LLM provider/model pricing. | Check the account's current plan and pricing before further use; the app's zero estimate applies only within the included quota. |
| Token usage | Available when the LLM provider reports it. | Not applicable. |
| Decision behavior | Generative; can use ticket context and produce natural-language summaries/actions. | Deterministic and auditable; decisions are limited to the six extracted signals and published table. |

To complete the measured comparison, configure the four environment variables,
create the 12-row table above, run a labelled 100-ticket baseline for the LLM,
switch to DecisionRules, and compare the same sample. Record the two displayed
category/priority accuracies, latency, and costs here after the run. The LLM
cost is only a useful comparison if its per-token rates are configured in
`LLM_MODEL_PRICING_JSON`.
