# Lab 7 approved change, metrics and readiness

**Status: preparation only.** This follows master §10 until the detailed Lab 7 handout is available. No maintenance change has been selected or approved.

## Approval and impact

| Field | Actual decision / evidence |
| --- | --- |
| Change request and purpose | |
| Existing implemented behavior and accepted version | |
| Requested changed behavior | |
| Why this is maintenance rather than an unfinished baseline feature | |
| Instructor/TA approval, date and reference | |
| Owner / teammate reviewer | |

| Affected requirement / feature / SDS / AC | Old behavior | Approved new behavior | Tests / code / data / compatibility affected | Contract revision and review |
| --- | --- | --- | --- | --- |
| | | | | |

Do not implement the assessed change before approval. Preserve the earlier baseline and the justified contract revision.

## Red / green, regression and delivery

| Step | Command / file / test or PR | Version | Actual result / evidence |
| --- | --- | --- | --- |
| Changed-behavior test before implementation | | | |
| Implementation and intended test passing | | | |
| Relevant integration / full regression | | | |
| Teammate-reviewed staging integration | | | |
| Reviewed main release / CI / deployment | | | |
| Affected independent UAT re-test, where applicable | | | |

The red test must fail for the intended changed behavior, not a broken environment. Do not weaken unrelated requirements to make the change pass.

## Five dated metrics

Use the actual repository, test output and workflow history retained since Lab 5. State the date/time and window; leave values blank until measured.

| Metric | Window / snapshot time | Source / query / run | Actual value | Scope / interpretation caveat |
| --- | --- | --- | --- | --- |
| Completed Issues | | | | |
| Merged PRs | | | | |
| Passing automated/regression tests | | | | |
| UAT defects opened / resolved | | | | |
| Successful / failed CI runs | | | | |

**Action-oriented interpretation (maximum 100 words):** fill after measuring. Counts alone are not evidence of engineering quality.

## Release readiness

| Area | Required check | Actual status / version / evidence |
| --- | --- | --- |
| Behavior and tests | Approved changed behavior and regression remain correct | |
| Defects / independent re-tests | Accepted findings resolved or clearly disclosed | |
| Technical debt / required unfinished work | Distinguish a compromise from a missing required feature | |
| Configuration / data | Safe env, migration compatibility and durable data | |
| Documents / release | Current contract/setup, reviewed version and identifiable deployment | |

## Short retrospective

| Question | One or two evidence-based sentences |
| --- | --- |
| What helped? | |
| What hurt? | |
| What will change next? | |
