# S027 publication contract

## Invocation

Existing workflow_dispatch on release.yml, ref main. Inputs: qualification_run 41595557848, version 0.2.0, previous_version0.1.0, short highlights; resume_execution_run empty initially. Head must remain 7d714ed723483d6bdb1a2286fb89fcbe8550cd40.

## Preconditions

All nine required qualification jobs pass; independent original artifact/receipt/assembly readback passes. Product/docs/schema versions match. Canonical predecessor isv0.1.0. Existing conflicting release state is rejected or recovered only with candidate-owned authority.

## Outputs and public invariants

Publishedv0.2.0 release, six exact Full/Lite packages, corresponding source and required metadata, canonical release.json, qualified before/after gates, latest selection and verified Pages export. Release notes end with the master CHANGELOG.md link. Predecessor asset bytes and historical source snapshot identities remain unchanged.

## Failure and recovery

Retain release-execution-RUN-ATTEMPT, including journal/state/candidate-evidence/publication-evidence. Resume only the same candidate through resume_execution_run. Never manually overwrite unrelated assets, rebuild accepted products, bypass failed evidence or silently declare a failed deployment complete.

## Audit boundary

The approved baseline produces the release. S027 audit PR records completed operations and is subject to green applicable CI, all comment dispositions, at most two review rounds and owner final merge. Audit-PR native acquisition evidence must observe actualv0.2.0; its new candidate builds are never republished.
