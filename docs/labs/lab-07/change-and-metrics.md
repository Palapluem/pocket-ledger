# Lab 7 change request, metrics and readiness

**Status: preparation only.** The detailed handout is available. No maintenance change has been selected yet. The later spec-sheet announcement says Instructor/TA approval is not required for the change request; both students must agree on a substantive, non-trivial change to behavior already implemented in Sprint 1. That announcement supersedes only the handout's Instructor/TA-approval wording; all other requirements remain.

## Team decision and impact

| Field | Actual decision / evidence |
| --- | --- |
| Change request and purpose | |
| Both students' agreement, rationale and decision date | |
| Existing implemented behavior and accepted version | |
| Requested changed behavior | |
| Why this is maintenance rather than an unfinished baseline feature | |
| Owner / teammate reviewer | |

| Affected requirement / feature / SDS / AC | Old behavior | Team-agreed new behavior | Tests / code / data / compatibility affected | Contract revision and review |
| --- | --- | --- | --- | --- |
| | | | | |

Do not implement the assessed change until both students have agreed on its scope and the teammate has reviewed the revised contract/STS. Instructor/TA approval is not required under the later announcement. Preserve the identified baseline and the justified contract revision.

## Announcement precedence and access for grading

- The spec-sheet announcement overrides only the handout's Instructor/TA-approval step. It does not waive the Sprint 1 baseline, impact analysis, teammate contract review, test-first evidence, regression, release or readiness requirements.
- Use synthetic test data. Supply safe test-account credentials through the private course handoff only; never place real passwords, tokens or production secrets in Git or the PDF.
- Keep the assessed deployment and public repository available throughout grading.

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
| Behavior and tests | Team-agreed changed behavior and regression remain correct | |
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
