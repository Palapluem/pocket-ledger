# Release and verification register

No accepted application release exists yet. The initial documentation bootstrap is not Sprint 1 completion.

| Accepted release / assessment | Main tag / full commit | Source tested and result/run | Integration and release PRs | Image digest / running revision | Deployment / smoke / UAT evidence |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

Keep the original Sprint 1 and Sprint 2 releases identifiable. Record the actual final version for final verification, not only a previous sprint's green run. Mark failures/skips and unresolved defects explicitly.

Do not create a new PR merely to record a preceding merge SHA. Final merge identity can be read from the release PR and CI/deployment metadata and cited directly in the course report. Assemble related release documentation in the release change; keep evidence of any post-merge main run in its immutable run/artifact record.

Preserve contract revisions, implementation history and CI runs. Main source commit, image digest and running revision identify different things; a database migration is not reverted simply by rolling back an app image.
