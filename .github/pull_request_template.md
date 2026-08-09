## Scope

- Complete slice:
- Out of scope:
- User or developer impact:

## Risk and CI classification

- Expected classification: `docs` / `web` / `android` / `shared` / `dependency` / `database` / `infra` / `unknown`
- [ ] The classification matches the actual diff; unknown or ambiguous paths fall back to full CI.
- [ ] Account, RLS, private data, migration, audio, recording, scoring-like, or core-practice risks are described below, or none apply.

## Validation evidence

- Focused local checks:
- Additional local build or static checks:
- [ ] The stable PR `quality` check is successful for the current head.
- [ ] Selected lanes succeeded and skipped lanes match the reviewed classification.
- [ ] Vercel reached a terminal successful state when applicable; this is deployment evidence, not browser QA.
- [ ] High-risk dependency, workflow, database, or supply-chain checks are not older than 24 hours.

## External QA and release

- Browser QA: `EXECUTED` / `NOT_EXECUTED` / not applicable
- Android device QA: `EXECUTED` / `NOT_EXECUTED` / not applicable
- Production or multi-account QA: `EXECUTED` / `NOT_EXECUTED` / not applicable
- QA level recommendation: `none` / `light` / `standard` / `strict`
- APK artifact: `not requested` / `manual private-test artifact required`
- Database deployment: `not required` / `manual reviewed dispatch required`

## Rollback

- Rollback trigger:
- Revert or recovery path:
- Data or migration reversibility, if applicable:
