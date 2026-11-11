# GRC

A governance, risk and compliance suite built as a Twenty app. It adds third-party risk management, contracts, policies, controls, framework compliance, a risk register, audits, findings and incidents to a Twenty workspace, with the automation that ties them together.

This is an MVP for internal review. It runs on an unmodified Twenty server: everything here is app code under this directory.

## What is in it

| Area | Objects | What it does |
| --- | --- | --- |
| Third-party risk | Vendor, Vendor assessment, Assessment response | Intake, automatic tiering, questionnaire-based due diligence, a public portal where vendors answer without an account, reviewer decision, findings raised from gaps |
| Contracts | Contract, Obligation | Lifecycle board, renewal calendar, protective clause tracking, automatic expiring and expired flags, obligations per party |
| Policies | Policy, Exception | Lifecycle from draft to retired, review cycle, attestation rate, time-boxed exceptions that lapse on their own |
| Compliance | Framework, Requirement, Control, Control mapping, Control test, Evidence | Frameworks imported from CISO Assistant, controls mapped once and carried across frameworks by crosswalk, compliance status rolled up from control health |
| Risk | Risk, Risk mitigation, Asset | 5x5 inherent and residual scoring, heat map, treatment board, links to controls, vendors and assets |
| Assurance | Audit, Finding, Incident | One findings register fed by audits, control tests, vendor assessments, incidents and monitoring |

On top of the 19 objects:

- 35 saved views (tables, kanban boards, a renewal calendar) and a sidebar organized by area.
- A "GRC overview" dashboard: KPIs, risk heat map, framework compliance, a queue of every upcoming or overdue deadline, and charts.
- Custom tabs on records: a vendor risk profile with contract gap detection, a framework coverage drill-down, and an assessment review screen.
- 15 logic functions (below, plus two that serve the console), 3 roles (GRC manager, Control owner, Auditor), and an AI agent with two skills.

## Two interfaces

- **GRC console** at `/s/grc/console`: a purpose-built interface with its own sign-in, module navigation, workflow steppers, the heat map, framework coverage, the vendor risk panel and the assessment review screen. It is a React app in `console/` that talks to Twenty's REST API as the signed-in user, so roles and permissions still apply. Its labels, options and field types come from the same `src/schema` as the data model.
- **Twenty's own UI** at `/`: the admin back office for bulk edits, imports, attachments, permissions and settings. Each console record has an "Edit in admin" link to it.

Build and deploy the console with the app:

```bash
yarn deploy        # yarn build:console, then twenty apply
```

The console bundle is written to `public/console/` (not committed) and served through two public routes. The page is a shell with no data in it; nothing is readable before sign-in.

## Automation

| Function | Trigger | Effect |
| --- | --- | --- |
| `tier-vendor` | Vendor created or updated | Rates inherent risk and tier from criticality, data shared and system access |
| `launch-vendor-assessment` | `POST /s/grc/assessments/launch` | Creates an assessment and one response per questionnaire question |
| `vendor-portal-page`, `vendor-portal-submit` | `GET` and `POST /s/grc/portal/:token`, public | Serves the questionnaire to the vendor and stores the answers |
| `refresh-assessment-score` | Response answer changed | Keeps the assessment score current |
| `complete-vendor-assessment` | `POST /s/grc/assessments/complete` | Records the decision, sets the vendor's residual risk and next review date, raises a finding per unmet question |
| `score-risk` | Risk created or updated | Derives score and level from likelihood and impact |
| `record-control-test` | Control test created | Sets control effectiveness, schedules the next test, raises a finding on failure |
| `recompute-compliance-*` | Control changed, mapping added or removed, or `POST /s/grc/compliance/recompute` | Re-rates every requirement and each framework's coverage |
| `daily-monitor` | Cron 06:00, or `POST /s/grc/monitor/run` | Flags expiring and lapsed contracts, stale evidence, overdue control tests and expired exceptions |

The scoring rules are plain functions in `src/domain/scoring.ts`. That file is the place to change thresholds.

## Run it

Prerequisites: a running Twenty server (version 2.51 or later) and Node 24.

```bash
cd packages/twenty-apps/internal/grc
yarn install
```

Create an API key in Twenty under Settings > APIs & Webhooks, then point the CLI at your server by writing `~/.twenty/config.json`:

```json
{
  "version": 1,
  "defaultRemote": "local",
  "remotes": {
    "local": { "apiUrl": "http://127.0.0.1:3000", "apiKey": "<your key>" }
  }
}
```

Install the app:

```bash
yarn twenty apply
```

Load the demo program (fictional vendors, controls, risks and so on, plus three frameworks and a vendor questionnaire):

```bash
TWENTY_API_KEY=<your key> yarn seed
```

The seed needs an empty GRC dataset and refuses to run twice. To start over, run `yarn twenty app:uninstall` and `yarn twenty apply` again; that deletes all GRC data.

Optionally hide the CRM entries from the sidebar:

```bash
TWENTY_API_KEY=<your key> yarn tsx scripts/prepare-demo-workspace.ts
```

### Rate limits

Twenty limits apps to 500 API calls per minute by default. The roll-ups batch their writes and retry when limited, but the seed makes several thousand calls in a few minutes. For the seed, raise the limits in `packages/twenty-server/.env` and restart the server:

```
API_RATE_LIMITING_SHORT_LIMIT=2000
API_RATE_LIMITING_LONG_LIMIT=20000
APPLICATION_API_RATE_LIMITING_LIMIT=20000
```

## Frameworks

Framework content is not stored in this repository. `yarn seed` and `yarn import-framework` read it from a local checkout of [CISO Assistant](https://github.com/intuitem/ciso-assistant-community) (AGPL-3.0), cloning it into `.cache/` on first use, or using `CISO_ASSISTANT_PATH` if set. Its library has several hundred frameworks:

```bash
TWENTY_API_KEY=<your key> yarn import-framework pcidss-4_0.yaml
TWENTY_API_KEY=<your key> yarn import-framework dora.yaml REGULATION
```

Many of those libraries carry their publisher's copyright (the notice is imported onto the framework record). Check that you are licensed to use a standard before importing it.

The seed maps each demo control to NIST CSF 2.0 by hand, then uses CISO Assistant's NIST CSF to ISO 27001 crosswalk to carry coverage across, keeping only strong relationships. SOC 2 has no crosswalk that strong, so the demo uses a coarse mapping from control domain to criteria (`SOC2_CRITERIA_BY_DOMAIN` in `scripts/data/program.ts`). Treat the SOC 2 percentages as illustrative.

## How the code is organized

```
src/
  schema/      The data model as plain data, and the builders that turn it into Twenty entities
  domain/      Scoring rules and route paths, shared by server and UI
  objects/ fields/ views/ navigation-menu-items/ page-layouts/
               One-line files that register what the schema describes
  logic-functions/   Server-side automation
  front-components/  Dashboard widgets and record tabs
  roles/ agents/ skills/
console/       The GRC console (React), bundled by scripts/build-console.ts
scripts/       Framework importer, demo seed and console build
```

To add a field, add one line to the object in `src/schema/objects.ts`. To add an object, add its spec there and a one-line file in `src/objects/`. Entity ids are derived from names, so there are no UUIDs to maintain; renaming a field or object is treated as delete and create.

## Known gaps

- The vendor portal is protected only by an unguessable link. It has no expiry, no per-vendor login and no file upload.
- No approval workflow engine: policy approval and exception approval are status changes, not routed sign-offs.
- No e-signature, redlining or clause extraction for contracts. Clauses are tagged by hand.
- No policy attestation campaigns. The attestation rate is a number someone enters.
- No evidence collection integrations. Evidence is uploaded or linked manually.
- No continuous vendor monitoring feeds (security ratings, breach news).
- The AI agent and skills are defined but were not exercised, because the test server had no AI model configured.
- Compliance roll-up recomputes everything on each change. That is fine for a few thousand requirements and will need to become incremental beyond that.
- The console edits workflow stages and creates vendors, risks, findings and control tests. Other field edits go through the admin UI.
- The console treats every status list as a linear stepper, including ones with alternative outcomes such as approved or rejected.
- No automated tests yet.
