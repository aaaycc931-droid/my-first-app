# OMR sample and fixture strategy

## Current policy

The current repository policy is to avoid committing real score samples or generated OMR artifacts. Real sheet music files, local Audiveris inputs, generated outputs, logs, and extracted images should stay outside the repository unless a future PR explicitly establishes a legal, minimal, reproducible fixture strategy.

## Why this matters

OMR validation files can create risks that are larger than the code changes they support:

* Copyright: real scores, scans, PDFs, MusicXML files, and derivative OMR outputs may be protected works or may include licensing terms that do not allow redistribution.
* Repository size: PDFs, images, MXL files, OMR exports, logs, and generated artifacts can quickly make the repository heavy and slow to clone.
* Privacy: locally tested files may contain user-provided music, personal annotations, filenames, paths, metadata, or other non-public information.
* Reproducibility: generated files can depend on local Audiveris versions, fonts, operating systems, binary paths, timestamps, or manual export settings.
* CI stability: tests that depend on large files, local binaries, or machine-specific outputs can become slow, flaky, or impossible to run in a clean CI environment.

## Forbidden files

Do not commit these files as OMR samples, fixtures, validation inputs, or generated outputs:

* PDF files.
* MXL files.
* XML or MusicXML score files from real scores.
* OMR project or export files.
* Log files from OMR tools or local validation runs.
* Image files, including scans, photos, screenshots, extracted pages, or generated score images.
* Generated artifacts from Audiveris, MusicXML tools, converters, renderers, or local scripts.
* Real score samples, even when they are only intended for manual testing.

## Allowed documentation

The repository may contain documentation about OMR sample handling, validation procedures, expected manual checks, and future fixture requirements. Manual validation notes are allowed when they describe the process and high-level observations without committing the real sample file, generated file, copyrighted content, raw logs, screenshots, or private metadata.

## Future fixture options

Future PRs may define a safe fixture strategy using one or more of these options:

* Synthetic minimal fixtures that are intentionally tiny and created for testing.
* Generated toy examples that can be recreated from source instructions or small deterministic scripts.
* Explicitly licensed public-domain samples after the license, provenance, and redistribution rights are documented.
* Tiny text-based unit fixtures where the content is safe, minimal, and not derived from a protected real score.
* External storage for large or manual validation inputs, with repository documentation that explains where authorized maintainers can find them without checking them into Git.

## Synthetic sample approach

The preferred future approach is to use small synthetic samples that are generated, reproducible, and free of copyright risk. A synthetic sample should be simple enough to inspect manually, deterministic enough to regenerate, and narrow enough to test one parser, importer, or UI behavior at a time.

Synthetic fixtures should favor the smallest representation that can validate the behavior under test. If a text-based fixture is enough, do not add a rendered image or binary export. If a generated artifact is needed for a future test, the generation source and legal basis should be reviewed before the artifact is committed.

## Local-only validation

Local Audiveris validation inputs and outputs should remain outside the repository. Developers may run Audiveris against local files for manual research, but the PDF input, exported MXL/XML/OMR files, logs, images, and generated artifacts should stay in local temp directories or external storage that is not committed to Git.

Documentation may record the command shape, validation checklist, and sanitized outcome, but it should not include private paths, copyrighted excerpts, raw tool logs, screenshots, or generated score files.

## CI strategy

CI should use small, legal, reproducible fixtures that can run in a clean environment. CI should not depend on a local Audiveris binary, local PDF files, machine-specific output paths, or manually generated artifacts.

Future CI fixtures should be reviewed for license safety, size, determinism, and value. Tests should prefer deterministic text fixtures and parser-level checks before introducing any larger generated or binary sample format.

## Review checklist

Before merging an OMR-related PR, reviewers should confirm:

* No PDF, MXL, XML, OMR, log, image, generated artifact, or real score sample files were added.
* Any new fixture is tiny, legal, reproducible, and intentionally scoped.
* Any public-domain or licensed sample has documented provenance and redistribution rights before it is committed.
* Local Audiveris inputs and outputs are not stored in the repository.
* CI does not require a local Audiveris binary or developer-only files.
* Documentation does not expose private file paths, private metadata, copyrighted excerpts, screenshots, or raw local logs.

## Relationship to real OMR architecture

The real OMR architecture plan must not move to production implementation until a legal sample and fixture strategy is established. Production OMR will need reliable validation data, but that validation data must not compromise copyright safety, repository hygiene, privacy, reproducibility, or CI stability.

## Non-goals for this PR

This PR does not:

* Add real samples.
* Add fixtures.
* Modify code.
* Modify APIs.
* Integrate real OMR.
* Modify providers.
