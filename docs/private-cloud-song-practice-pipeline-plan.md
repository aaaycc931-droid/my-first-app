# P35 — Private Cloud Song Practice Pipeline Plan

## Product Decision

The product will **not** build community upload, public music sharing, or a public resource library.

Future product direction allows:

- private cloud upload;
- private user library;
- private song analysis;
- private practice draft;
- private practice feedback;
- no public sharing;
- no community resource browsing;
- no public download;
- no public playback of user-uploaded copyrighted audio.

The current MVP continues to be:

- browser-local;
- non-scoring;
- no upload;
- no cloud;
- no account;
- no database.

This is the **current MVP boundary**, not a permanent product boundary. P35 is a docs-only architecture update and does not implement upload, cloud processing, accounts, storage, databases, source separation, melody extraction runtime, or scoring.

## Why the current MVP remains browser-local

The current MVP stays browser-local because the project is still validating the core practice experience: local recording, local pitch estimation, local onset diagnostics, imported target feedback, and non-scoring rhythm feedback. Keeping this stage browser-local avoids premature complexity in account management, object storage, copyright workflows, security review, job queues, GPU processing, and data retention policies.

Browser-local work is also the fastest way to continue stabilizing `/practice` without changing the product's operational risk. The existing pitch / onset / rhythm foundation can be tested immediately in the browser, while cloud upload would require a separate privacy, copyright, infrastructure, and processing architecture before any user audio is accepted by a server.

## Why future private cloud upload is allowed

Future private cloud upload is allowed because full-song practice generation can require processing that is too heavy, too slow, or too specialized for the browser. Source separation, vocal melody extraction, beat / phrase analysis, long-audio preprocessing, and confidence diagnostics may need server-side workers and specialized compute.

Private cloud upload is only for a user's own private practice workflow. It is not a community feature and does not imply public browsing, public playback, public search, public download, or shared resource publishing.

## Private cloud upload vs community upload

| Area | Private cloud upload | Community upload |
| --- | --- | --- |
| Visibility | Private to the uploading user | Visible or discoverable by other users |
| Purpose | Personal practice analysis and private practice drafts | Shared resource publishing or browsing |
| Playback | Private practice playback only, subject to product rules | Public or semi-public playback risk |
| Discovery | No public search or browsing | Search, feeds, categories, or public library |
| Download | No public download | Often implies public or shared access |
| Product fit | Allowed future direction | Explicitly out of scope |

The project does not build community features because they would expand the product into moderation, public copyright distribution risk, public discovery, public storage abuse, social workflows, takedown operations, and content governance. Those are not required to validate private song practice.

## Capability boundaries

### 1. Current MVP Boundary

Current code stage:

- browser-local;
- local recording;
- local pitch estimation;
- local onset diagnostics;
- local rhythm diagnostic feedback;
- imported target feedback;
- no upload;
- no cloud;
- no account;
- no database;
- no formal scoring.

Boundary: this stage can improve local diagnostics and `/practice` usability, but it must not add upload runtime, server storage, account identity, database persistence, private library persistence, cloud processing, or formal scoring.

### 2. Future Local Import Stage

Future short- to medium-term stage:

- user selects a local audio file;
- browser-local decode;
- local melody guide pitch curve draft;
- local rhythm / onset diagnostics;
- no server upload;
- no account;
- no database;
- no community.

Boundary: this stage can validate the song-practice experience using local files before any cloud runtime exists. The browser may decode and analyze locally, but it should not persist a private library server-side or upload files.

### 3. Future Private Cloud Stage

Future formal product stage:

- account;
- private object storage;
- private upload;
- cloud audio preprocessing;
- source separation;
- vocal melody extraction;
- rhythm / beat / onset / phrase analysis;
- private practice draft;
- private practice library;
- delete source file option;
- no community sharing;
- no public browsing;
- no public download;
- no public playback.

Boundary: this stage starts only after account, storage, privacy, copyright, security, job processing, and deletion requirements are designed. It is not part of the current MVP runtime.

## Future pipeline architecture

```text
Private user audio upload
  ↓
Private object storage
  ↓
Audio preprocessing
  - format normalization
  - loudness normalization
  - duration / quality checks
  - sample-rate conversion
  ↓
Source separation
  - vocals
  - accompaniment
  - optional drums / bass / other
  ↓
Vocal melody extraction
  - F0 / pitch tracking
  - voiced / unvoiced detection
  - octave diagnostics
  - smoothing
  - note segmentation
  ↓
Rhythm / beat / phrase analysis
  - vocal onsets
  - accompaniment beat grid
  - tempo
  - downbeat
  - phrase boundaries
  ↓
Practice draft generation
  - target pitch curve
  - target rhythm events
  - beat grid
  - phrase segments
  - confidence diagnostics
  - needs user review
  ↓
Practice Mode integration
  - accompaniment playback
  - user singing / recording
  - pitch feedback
  - rhythm feedback
  - future scoring
```

## Song analysis responsibilities

After a user privately uploads music in the future, the platform should create a private analysis job linked to that user and source file. The job should normalize the audio, check duration and quality, optionally separate stems, extract vocal melody candidates, analyze rhythm / beat / phrase structure, and generate a practice draft. The generated draft is not an authoritative score; it is a reviewable practice artifact.

Source separation sits after preprocessing because the system needs consistent sample rate, loudness, format, and duration checks before compute-heavy separation. Vocal melody extraction sits after source separation because the vocal stem is the best candidate source for F0 / pitch tracking, voiced / unvoiced detection, octave diagnostics, smoothing, and note segmentation. Rhythm / beat / onset / phrase extraction should combine evidence from vocals, accompaniment, and original audio: vocal onsets help phrase and lyric-like timing, accompaniment helps tempo and beat grid, and original audio helps detect global structure.

Target pitch curve, target rhythm events, phrase segments, and beat grid should be generated as a `SongPracticeDraft` that requires user review. Formal scoring remains deferred until draft quality, alignment confidence, user correction workflows, latency handling, microphone variance, and scoring semantics are stable.

## Future data model sketch

These are docs-only schema sketches, not runtime TypeScript types.

```ts
type ProcessingStatus = "pending" | "processing" | "needs_user_review" | "ready" | "failed" | "deleted";
type Visibility = "private";

type PrivatePracticeResource = {
  id: string;
  ownerUserId: string; // private ownership
  visibility: Visibility; // no public visibility
  sourceFileId: string | null; // original private object relation
  sourceFileDeletedAt: string | null; // source deletion strategy
  status: ProcessingStatus;
  latestAnalysisJobId: string | null;
  practiceDraftIds: string[]; // generated practice data
  needsUserReview: boolean;
  confidenceSummary: { overall: number | null; warnings: string[] };
};

type SongAnalysisJob = {
  id: string;
  ownerUserId: string;
  resourceId: string;
  sourceFileId: string;
  status: ProcessingStatus;
  preprocessingStatus: ProcessingStatus;
  separationStatus: ProcessingStatus;
  melodyExtractionStatus: ProcessingStatus;
  rhythmAnalysisStatus: ProcessingStatus;
  generatedDraftId: string | null;
  confidenceDiagnostics: { stage: string; confidence: number | null; warnings: string[] }[];
  needsUserReview: boolean;
  publicVisibility: false;
};

type SourceSeparationResult = {
  id: string;
  ownerUserId: string;
  jobId: string;
  sourceFileId: string;
  status: ProcessingStatus;
  vocalStemFileId: string | null;
  accompanimentStemFileId: string | null;
  optionalStemFileIds: string[];
  confidenceDiagnostics: { vocals: number | null; accompaniment: number | null; warnings: string[] };
  sourceFileDeletedAt: string | null;
  publicVisibility: false;
};

type VocalMelodyExtractionResult = {
  id: string;
  ownerUserId: string;
  jobId: string;
  vocalStemFileId: string | null;
  sourceFileId: string;
  status: ProcessingStatus;
  pitchCurveDraftId: string | null;
  voicedUnvoicedSegments: { startMs: number; endMs: number; voiced: boolean; confidence: number | null }[];
  noteSegmentDraftIds: string[];
  confidenceDiagnostics: { octaveWarnings: string[]; noisyFrames: number; overall: number | null };
  needsUserReview: boolean;
  publicVisibility: false;
};

type SongPracticeDraft = {
  id: string;
  ownerUserId: string;
  resourceId: string;
  sourceFileId: string | null;
  status: ProcessingStatus;
  targetPitchCurveDraftId: string | null;
  targetRhythmEventDraftIds: string[];
  segmentDraftIds: string[];
  beatGrid: { timeMs: number; beatIndex: number; confidence: number | null }[];
  confidenceDiagnostics: { overall: number | null; warnings: string[] };
  needsUserReview: boolean;
  sourceFileDeletedAt: string | null;
  publicVisibility: false;
};

type PracticeSegmentDraft = {
  id: string;
  ownerUserId: string;
  draftId: string;
  sourceFileId: string | null;
  startMs: number;
  endMs: number;
  label: string | null;
  targetPitchCurveDraftId: string | null;
  targetRhythmEventDraftIds: string[];
  confidenceDiagnostics: { boundaryConfidence: number | null; warnings: string[] };
  needsUserReview: boolean;
  publicVisibility: false;
};

type TargetPitchCurveDraft = {
  id: string;
  ownerUserId: string;
  draftId: string;
  sourceFileId: string | null;
  points: { timeMs: number; frequencyHz: number | null; voiced: boolean; confidence: number | null }[];
  smoothingVersion: string;
  confidenceDiagnostics: { octaveWarnings: string[]; unvoicedRatio: number; overall: number | null };
  needsUserReview: boolean;
  publicVisibility: false;
};

type TargetRhythmEventDraft = {
  id: string;
  ownerUserId: string;
  draftId: string;
  sourceFileId: string | null;
  timeMs: number;
  eventType: "vocal_onset" | "beat" | "downbeat" | "phrase_boundary";
  confidence: number | null;
  confidenceDiagnostics: { source: "vocals" | "accompaniment" | "original"; warnings: string[] };
  needsUserReview: boolean;
  publicVisibility: false;
};
```

## Copyright, privacy, and product boundary

- Users upload audio only for private practice.
- No public sharing.
- No community library.
- No public search.
- No public playback.
- No public download.
- Users must confirm they have rights or lawful permission for uploaded content.
- Users can delete the source file.
- The platform may keep generated practice data only if the user chooses.
- A copyright notice and takedown process are needed before private cloud launch.
- Uploaded audio should not be used to train models without separate consent.

This is a product and privacy boundary summary, not legal advice.

## Technical feasibility and limitations

Future source separation can split original audio into vocals, accompaniment, and optionally drums / bass / other stems. Future pitch tracking and melody extraction can use the vocal stem to draft the main vocal pitch curve. Future analysis can combine vocals, accompaniment, and original audio to estimate melody pitch, voiced / unvoiced regions, vibrato / slide diagnostics, rhythm onsets, tempo / beat grid, and phrase segments.

However, full-song extraction is imperfect. Harmony, choir, rap, noisy recordings, strong reverb, dense mixes, weak vocals, and unusual production can fail or produce low-confidence outputs. Accompaniment-only audio cannot reliably recover the original vocal melody. Generated output should be treated as a practice draft, not an authoritative score. User review and correction are required before any formal scoring system can be trusted.

## Updated route

### A. Browser-local MVP foundation

- Goal: stabilize browser-local pitch, onset, rhythm diagnostics, and imported target feedback.
- Allowed scope: local recording, local pitch estimation, local onset diagnostics, non-scoring feedback, `/practice` component stabilization.
- Non-goals: upload, cloud, account, database, storage, community, formal scoring.
- Dependencies: existing browser APIs and current practice UI.
- Expected output: stable local diagnostic practice foundation.
- Boundary: current runtime remains no upload and no cloud.

### B. Local Melody Guide Import

- Goal: let users choose a local audio file for practice research.
- Allowed scope: browser file selection, browser-local decode, local-only consent copy, local diagnostics.
- Non-goals: server upload, private library persistence, account, database, community.
- Dependencies: browser decode capability and current practice diagnostics.
- Expected output: local audio can act as a melody guide input.
- Boundary: selected files stay in the browser session.

### C. Local Target Pitch Curve Draft

- Goal: generate a local draft pitch curve from local audio where feasible.
- Allowed scope: browser-local pitch tracking, confidence warnings, draft preview, user-facing limitations.
- Non-goals: authoritative transcription, source separation runtime, cloud processing, scoring.
- Dependencies: Local Melody Guide Import and local pitch engine stability.
- Expected output: reviewable local target pitch curve draft.
- Boundary: draft is non-scoring and session-local unless a later storage architecture exists.

### D. Private Practice Library Architecture

- Goal: design private resource ownership, storage, retention, deletion, and generated practice data architecture.
- Allowed scope: docs, schema planning, security / privacy / copyright requirements, UX flows.
- Non-goals: runtime upload, object storage implementation, account implementation, database migrations.
- Dependencies: validated local import and target draft user experience.
- Expected output: implementation-ready private library architecture.
- Boundary: architecture first; no cloud runtime until requirements are complete.

### E. Private Cloud Upload MVP

- Goal: accept private user uploads for private processing.
- Allowed scope: account-gated private upload, private object storage, source deletion option, upload consent.
- Non-goals: public sharing, public playback, public download, community browsing, formal scoring.
- Dependencies: account, storage, privacy, copyright notice, takedown process, security review.
- Expected output: private source files can be uploaded and managed by their owner.
- Boundary: upload is private and not discoverable.

### F. Cloud Audio Processing Worker

- Goal: process private audio jobs asynchronously.
- Allowed scope: job queue, preprocessing, format normalization, loudness normalization, sample-rate conversion, quality checks.
- Non-goals: community processing, public assets, scoring.
- Dependencies: Private Cloud Upload MVP and job infrastructure.
- Expected output: normalized private audio ready for analysis.
- Boundary: processing results remain private to the owner.

### G. Source Separation

- Goal: create vocal and accompaniment stems for analysis and practice.
- Allowed scope: private worker-side separation, confidence diagnostics, optional stems.
- Non-goals: public stem sharing, public download, guaranteed clean separation.
- Dependencies: Cloud Audio Processing Worker and suitable compute.
- Expected output: private vocal / accompaniment stem results with warnings.
- Boundary: stems inherit private visibility and deletion policy.

### H. Vocal Melody Extraction

- Goal: extract reviewable melody pitch curve candidates from vocal stems.
- Allowed scope: F0 tracking, voiced / unvoiced detection, octave diagnostics, smoothing, note segmentation.
- Non-goals: authoritative score, lyrics, formal scoring.
- Dependencies: Source Separation and pitch tracking pipeline.
- Expected output: target pitch curve draft with confidence diagnostics.
- Boundary: user review required.

### I. Rhythm / Beat / Phrase Extraction

- Goal: extract timing structures for practice.
- Allowed scope: vocal onsets, accompaniment beat grid, tempo, downbeat, phrase boundaries, confidence diagnostics.
- Non-goals: formal rhythm score, persistent assessment history, community timing maps.
- Dependencies: preprocessing, source separation, melody extraction evidence.
- Expected output: target rhythm events, beat grid, phrase segment drafts.
- Boundary: timing output is draft data until reviewed.

### J. Practice Draft Review

- Goal: let users review and correct generated practice drafts.
- Allowed scope: edit / accept pitch curve, rhythm events, beat grid, phrase segments, confidence warnings.
- Non-goals: public publishing, shared correction marketplace, scoring.
- Dependencies: pitch and rhythm draft generation.
- Expected output: user-approved private practice draft.
- Boundary: review is required before formal scoring.

### K. Practice Mode Integration

- Goal: use approved drafts inside practice mode.
- Allowed scope: accompaniment playback, user singing / recording, pitch feedback, rhythm feedback, segment practice.
- Non-goals: public playback of uploaded copyrighted audio, community library, formal scoring unless later approved.
- Dependencies: Practice Draft Review and private resource playback policy.
- Expected output: private song practice experience.
- Boundary: feedback remains practice-oriented unless scoring system is separately built.

### L. Formal Scoring System

- Goal: produce reliable scoring only after draft quality and review workflows are mature.
- Allowed scope: scoring model design, calibration, latency handling, confidence thresholds, user-visible scoring semantics.
- Non-goals: scoring from unreviewed drafts, hidden authoritative grades, comprehensive assessment without validation.
- Dependencies: reviewed drafts, stable pitch / rhythm feedback, latency calibration, validation data, product scoring policy.
- Expected output: trustworthy formal scoring system.
- Boundary: deferred until the practice draft pipeline is proven.

## Current stage recommendation

Do not build cloud upload runtime in the near term.

Recommended order:

1. Finish `/practice` component stabilization.
2. Build Local Melody Guide Audio Import.
3. Build Local Target Pitch Curve Draft.
4. Build Practice Draft Review.
5. Then design Private Practice Library architecture.
6. Finally build private cloud upload runtime.

Reasons:

- The project already has browser-local pitch / onset / rhythm foundation.
- Local import can validate the core practice experience before server-side storage exists.
- Private cloud requires account, storage, security, copyright, job queue, and GPU processing decisions.
- Connecting cloud too early would cause product and infrastructure complexity to grow before the practice workflow is validated.

## P35 strict boundary confirmation

P35 does not modify `/api/recognize`, upload runtime, cloud runtime, AI API, account, database, object storage, parser, converter, formal scoring, rhythm scoring, sight-singing comprehensive scoring, persistent rhythm history, audio fixtures, `metadata.local.json`, piano runtime, `/piano`, production Audiveris behavior, package dependencies, or UI runtime.
