"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LocalPianoPanel } from "../piano/LocalPianoPanel";
import {
  createBrowserAudioChannel,
  stopAllBrowserAudio,
  subscribeBrowserAudioStopAll,
  type BrowserAudioChannel,
} from "../../lib/audio/browserAudioEngine";
import { noteNameToMidi } from "../../lib/audio/noteFrequency";
import {
  createLocalEarTrainingMelodyQuestion,
  earTrainingMelodyNotes,
  getEarTrainingMelodyNoteIds,
  getLocalEarTrainingMelodyAnswer,
  getLocalEarTrainingMelodyVariantCount,
  type EarTrainingMelodyDictationDifficulty,
  type EarTrainingMelodyNoteId,
} from "../../lib/practice/localEarTrainingMelodyDictation";
import type {
  LocalPracticeAnswerResult,
  LocalPracticeReviewTarget,
} from "../../lib/practice/localPracticeReviewQueue";
import type { ResolvedLocalPracticeCustomization } from "../../lib/practice/localPracticeCustomizer";
import { useLocalAudioPlayback } from "./useLocalAudioPlayback";
import { useLockedPracticeAnswer } from "./useLockedPracticeAnswer";
import { useLocalQuestionSchedule } from "./useLocalQuestionSchedule";
import { ActivityOrderedChoiceAnswerPanel } from "./ActivityChoiceAnswerPanel";
import { ActivityProtocolState } from "./ActivityProtocolState";
import { useChoiceActivitySession } from "./useChoiceActivitySession";
import { adaptMelodyDictationQuestionToActivity } from "../../lib/activity/legacyLocalActivityAdapter";
import type { ActivityAnswer } from "../../lib/activity/activityAnswer";
import type { ActivityCheckEvidence } from "../../lib/activity/activitySession";
import {
  adaptFixedSolfegeAnswerToActivityEvidence,
  createFixedSolfegeAnswer,
  enableMelodyFixedSolfegeInput,
  FIXED_SOLFEGE_TOKEN_BY_NOTE_ID,
} from "../../lib/activity/melodySolfegeActivityAdapter";
import {
  adaptMelodyPianoAnswerToActivityEvidence,
  adaptMelodyScreenPianoNoteEventsToNoteIds,
  createMelodyPianoInputOriginId,
  createMelodyPianoAnswerFromNoteEvents,
  enableMelodyPianoInput,
} from "../../lib/activity/melodyPianoActivityAdapter";
import { createScreenPianoActivityNoteOn } from "../../lib/activity/pianoNoteEventActivityAdapter";
import type { NoteEventV1 } from "../../lib/music/noteEvent";
import {
  adaptMelodyStaffNotationAnswerToActivityEvidence,
  createMelodyStaffNotationAnswer,
  enableMelodyStaffNotationInput,
} from "../../lib/activity/melodyStaffNotationActivityAdapter";
import {
  adaptMelodyNumberedNotationAnswerToActivityEvidence,
  createMelodyNumberedNotationAnswer,
  enableMelodyNumberedNotationInput,
} from "../../lib/activity/melodyNumberedNotationActivityAdapter";
import {
  createScoreDocumentFromMelodyNumberedNotationDraft,
  createScoreDocumentFromMelodyStaffNotationDraft,
  type MelodyDictationAnswerScoreDocumentV1,
  type MelodyDictationNumberedAnswerScoreDocumentV1,
} from "../../lib/music/scoreDocument";
import {
  canConfirmMelodyStaffNotationDraft,
  checkMelodyStaffNotationDraft,
  confirmMelodyStaffNotationDraft,
  createMelodyStaffNotationDraft,
  setMelodyStaffNotationDraftNote,
  validateMelodyStaffNotationDraft,
  type MelodyStaffNotationDraftV1,
} from "../../lib/practice/localMelodyStaffNotationDraft";
import { MelodyStaffNotationInput } from "./MelodyStaffNotationInput";
import {
  canConfirmMelodyNumberedNotationDraft,
  checkMelodyNumberedNotationDraft,
  confirmMelodyNumberedNotationDraft,
  createMelodyNumberedNotationDraft,
  setMelodyNumberedNotationDraftNote,
  validateMelodyNumberedNotationDraft,
  type MelodyNumberedNotationDraftV1,
} from "../../lib/practice/localMelodyNumberedNotationDraft";
import {
  MelodyNumberedNotationInput,
  getMelodyNumberedNotationPresentation,
} from "./MelodyNumberedNotationInput";
import { LocalMelodyImitationPanel } from "./LocalMelodyImitationPanel";

type MelodyAnswerMode = "choice" | "solfege" | "piano" | "staff-notation" | "numbered-notation";
type MelodyPracticeMode = "dictation" | "imitation";

const EMPTY_MELODY_SELECTION: Array<string | null> = [null, null, null];
const isCompleteMelodySelection = (selection: Array<string | null>) =>
  selection.every((noteId) => noteId !== null);

const getFixedSolfegeLabel = (noteId: string) => {
  const token = FIXED_SOLFEGE_TOKEN_BY_NOTE_ID[
    noteId as keyof typeof FIXED_SOLFEGE_TOKEN_BY_NOTE_ID
  ];
  const pitchLabel = earTrainingMelodyNotes[
    noteId as keyof typeof earTrainingMelodyNotes
  ].label;
  const syllable = noteId === "c5"
    ? "高音 do"
    : noteId === "f-sharp-4"
      ? "升 fa"
      : token.startsWith("ti")
        ? "si"
        : token.replace(/[0-9]/g, "");
  return `${syllable}（${pitchLabel}）`;
};

export function LocalEarTrainingMelodyDictationPanel({
  initialReviewTarget,
  customPractice,
  onLocalAnswerResult,
  onLeaveReviewTarget,
  showLocalPiano = false,
  expandedLocalCatalog = false,
}: {
  initialReviewTarget?: Extract<LocalPracticeReviewTarget, { kind: "melody-dictation" }>;
  customPractice?: ResolvedLocalPracticeCustomization;
  onLocalAnswerResult?: (result: LocalPracticeAnswerResult) => void;
  onLeaveReviewTarget?: () => void;
  showLocalPiano?: boolean;
  expandedLocalCatalog?: boolean;
}) {
  const activeCustomPractice = !initialReviewTarget && customPractice?.customization.kind === "melody-dictation"
    ? customPractice
    : undefined;
  const [isLocalPianoOpen, setIsLocalPianoOpen] = useState(false);
  const [practiceMode, setPracticeMode] = useState<MelodyPracticeMode>("dictation");
  const [imitationEpoch, setImitationEpoch] = useState(0);
  const [answerMode, setAnswerMode] = useState<MelodyAnswerMode>("choice");
  const [difficulty, setDifficulty] = useState<EarTrainingMelodyDictationDifficulty>(initialReviewTarget?.difficulty ?? activeCustomPractice?.customization.difficulty ?? "基础");
  const [sequence, setSequence] = useState(initialReviewTarget?.sequence ?? 0);
  const catalogMode = expandedLocalCatalog || activeCustomPractice ? "expanded-local-v2" : "legacy-v1";
  const pianoAnswerAvailable = expandedLocalCatalog && !initialReviewTarget && !activeCustomPractice;
  const imitationModeActive = practiceMode === "imitation" && pianoAnswerAvailable;
  const staffNotationAnswerAvailable = pianoAnswerAvailable;
  const numberedNotationAnswerAvailable = pianoAnswerAvailable;
  const variantCount = activeCustomPractice?.variantCount ?? getLocalEarTrainingMelodyVariantCount(difficulty, catalogMode);
  const { questionIndex, sessionSeed, isReady: isQuestionReady } = useLocalQuestionSchedule({
    itemCount: variantCount,
    sequence,
    isCourseExercise: false,
    replaySeed: initialReviewTarget?.seed,
  });
  const answerLock = useLockedPracticeAnswer<Array<string | null>>(
    EMPTY_MELODY_SELECTION,
    isCompleteMelodySelection,
  );
  const selectedNoteIds = answerLock.selection;
  const isAnswerVisible = answerLock.isAnswerVisible;
  const [audioError, setAudioError] = useState("");
  const [hasHeardComplete, setHasHeardComplete] = useState(false);
  const [qualificationNotice, setQualificationNotice] = useState("");
  const [pianoInputArmed, setPianoInputArmed] = useState(false);
  const [staffNotationDraft, setStaffNotationDraft] = useState<MelodyStaffNotationDraftV1 | null>(null);
  const [staffNotationDocument, setStaffNotationDocument] = useState<MelodyDictationAnswerScoreDocumentV1 | null>(null);
  const [numberedNotationDraft, setNumberedNotationDraft] = useState<MelodyNumberedNotationDraftV1 | null>(null);
  const [numberedNotationDocument, setNumberedNotationDocument] = useState<MelodyDictationNumberedAnswerScoreDocumentV1 | null>(null);
  const hasPlaybackQualificationRef = useRef(false);
  const staffPlaybackQualificationIdRef = useRef<string | null>(null);
  const numberedPlaybackQualificationIdRef = useRef<string | null>(null);
  const completionTimerRef = useRef<number | null>(null);
  const audioStateCleanupRef = useRef<(() => void) | null>(null);
  const playbackTokenRef = useRef(0);
  const playbackActiveRef = useRef(false);
  const pianoInputEventsRef = useRef<NoteEventV1[]>([]);
  const pianoInputChannelRef = useRef<BrowserAudioChannel | null>(null);
  const pianoInputOriginRef = useRef<string | null>(null);
  const pianoInputRunRef = useRef(0);
  const pianoToneTokenRef = useRef(0);
  const mountedRef = useRef(true);
  const { isPlaying, playbackState, play, stop: stopPlayback } = useLocalAudioPlayback();
  const question = useMemo(() => createLocalEarTrainingMelodyQuestion({
    difficulty,
    sequence,
    questionIndex,
    variantId: initialReviewTarget?.variantId ?? activeCustomPractice?.variantIds[questionIndex],
    catalogMode,
  }), [activeCustomPractice, catalogMode, difficulty, initialReviewTarget?.variantId, questionIndex, sequence]);
  const answer = useMemo(() => getLocalEarTrainingMelodyAnswer({ question, selectedNoteIds }), [question, selectedNoteIds]);
  const activityDefinition = useMemo(
    () => {
      const definition = enableMelodyFixedSolfegeInput(
        adaptMelodyDictationQuestionToActivity(question),
      );
      const pianoDefinition = pianoAnswerAvailable
        ? enableMelodyPianoInput(definition)
        : definition;
      const staffDefinition = staffNotationAnswerAvailable
        ? enableMelodyStaffNotationInput(pianoDefinition)
        : pianoDefinition;
      return numberedNotationAnswerAvailable
        ? enableMelodyNumberedNotationInput(staffDefinition)
        : staffDefinition;
    },
    [numberedNotationAnswerAvailable, pianoAnswerAvailable, question, staffNotationAnswerAvailable],
  );
  const activity = useChoiceActivitySession(activityDefinition, `melody-dictation:${question.id}`);

  const clearCompletionTimer = useCallback(() => {
    if (completionTimerRef.current !== null) window.clearTimeout(completionTimerRef.current);
    completionTimerRef.current = null;
  }, []);

  const clearAudioStateWatch = useCallback(() => {
    audioStateCleanupRef.current?.();
    audioStateCleanupRef.current = null;
  }, []);

  const clearQualification = useCallback(() => {
    playbackTokenRef.current += 1;
    playbackActiveRef.current = false;
    hasPlaybackQualificationRef.current = false;
    clearCompletionTimer();
    clearAudioStateWatch();
    stopPlayback();
    pianoInputChannelRef.current?.stop();
    pianoInputEventsRef.current = [];
    pianoInputOriginRef.current = null;
    staffPlaybackQualificationIdRef.current = null;
    numberedPlaybackQualificationIdRef.current = null;
    pianoToneTokenRef.current += 1;
    setPianoInputArmed(false);
    setStaffNotationDraft(null);
    setStaffNotationDocument(null);
    setNumberedNotationDraft(null);
    setNumberedNotationDocument(null);
    setHasHeardComplete(false);
  }, [clearAudioStateWatch, clearCompletionTimer, stopPlayback]);

  const invalidateAttempt = useCallback((message = "") => {
    clearQualification();
    answerLock.reset();
    activity.restart();
    setAudioError("");
    setQualificationNotice(message);
  }, [activity, answerLock, clearQualification]);

  useEffect(() => {
    const unsubscribe = subscribeBrowserAudioStopAll(() => {
      if (playbackActiveRef.current || hasPlaybackQualificationRef.current) {
        invalidateAttempt("听题资格已因页面切换、后台或全局停止而作废；旧填写与检查已清除，请重新完整播放。 ");
      }
    });
    return unsubscribe;
  }, [invalidateAttempt]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      playbackTokenRef.current += 1;
      pianoToneTokenRef.current += 1;
      playbackActiveRef.current = false;
      hasPlaybackQualificationRef.current = false;
      clearCompletionTimer();
      clearAudioStateWatch();
      pianoInputChannelRef.current?.stop();
      pianoInputEventsRef.current = [];
      pianoInputOriginRef.current = null;
      staffPlaybackQualificationIdRef.current = null;
      numberedPlaybackQualificationIdRef.current = null;
    };
  }, [clearAudioStateWatch, clearCompletionTimer]);

  const resetCurrentQuestion = () => {
    clearQualification();
    answerLock.reset();
    activity.restart();
    setAudioError("");
    setQualificationNotice("");
  };
  const playQuestion = async () => {
    playbackTokenRef.current += 1;
    const token = playbackTokenRef.current;
    playbackActiveRef.current = false;
    hasPlaybackQualificationRef.current = false;
    clearCompletionTimer();
    clearAudioStateWatch();
    stopPlayback();
    pianoInputChannelRef.current?.stop();
    pianoInputEventsRef.current = [];
    pianoInputOriginRef.current = null;
    staffPlaybackQualificationIdRef.current = null;
    numberedPlaybackQualificationIdRef.current = null;
    pianoToneTokenRef.current += 1;
    setPianoInputArmed(false);
    setStaffNotationDraft(null);
    setStaffNotationDocument(null);
    setNumberedNotationDraft(null);
    setNumberedNotationDocument(null);
    setHasHeardComplete(false);
    answerLock.reset();
    const documentAnswerMode = answerMode === "staff-notation" || answerMode === "numbered-notation";
    const playbackAttemptId = documentAnswerMode
      ? `${activity.session.sessionId}:attempt:${activity.session.attemptNumber + 1}`
      : activity.session.attemptId;
    if (documentAnswerMode) activity.restart();
    else activity.restartIfDirty();
    setAudioError("");
    setQualificationNotice("");
    const playbackError = await play((audioContext, channel) => {
      if (token !== playbackTokenRef.current) return 1;
      const startDelayMs = 80;
      const startTime = audioContext.currentTime + startDelayMs / 1_000;
      const oscillators = question.melody.noteIds.map((noteId, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const noteStartTime = startTime + index * 0.68;
        oscillator.type = "sine";
        oscillator.frequency.value = earTrainingMelodyNotes[noteId as keyof typeof earTrainingMelodyNotes].frequencyHz;
        gain.gain.setValueAtTime(0.0001, noteStartTime);
        gain.gain.exponentialRampToValueAtTime(0.16, noteStartTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStartTime + 0.5);
        oscillator.connect(gain); gain.connect(audioContext.destination);
        oscillator.start(noteStartTime); oscillator.stop(noteStartTime + 0.52);
        return channel.trackSource(oscillator, [gain]);
      });
      playbackActiveRef.current = true;
      const handleAudioStateChange = () => {
        if (
          token === playbackTokenRef.current
          && (playbackActiveRef.current || hasPlaybackQualificationRef.current)
          && audioContext.state !== "running"
        ) {
          invalidateAttempt("本轮音频时间线被中断，听题资格未授予；请重新完整播放。 ");
        }
      };
      audioContext.addEventListener("statechange", handleAudioStateChange);
      audioStateCleanupRef.current = () =>
        audioContext.removeEventListener("statechange", handleAudioStateChange);
      const expectedAudioEnd = startTime + 2 * 0.68 + 0.52;
      const durationMs = startDelayMs + 2_120;
      completionTimerRef.current = window.setTimeout(() => {
        if (token !== playbackTokenRef.current || !playbackActiveRef.current) return;
        if (audioContext.state !== "running" || audioContext.currentTime + 0.02 < expectedAudioEnd) {
          invalidateAttempt("本轮音频时间线没有完整走完，听题资格未授予；请重新播放。 ");
          return;
        }
        playbackActiveRef.current = false;
        hasPlaybackQualificationRef.current = true;
        if (answerMode === "staff-notation") {
          const qualificationId = `melody-staff:${question.variantId}:${playbackAttemptId}:playback-${token}`;
          staffPlaybackQualificationIdRef.current = qualificationId;
          setStaffNotationDraft(createMelodyStaffNotationDraft({
            question,
            attemptId: playbackAttemptId,
            playbackQualificationId: qualificationId,
          }));
        } else if (answerMode === "numbered-notation") {
          const qualificationId = `melody-numbered:${question.variantId}:${playbackAttemptId}:playback-${token}`;
          numberedPlaybackQualificationIdRef.current = qualificationId;
          setNumberedNotationDraft(createMelodyNumberedNotationDraft({
            question,
            attemptId: playbackAttemptId,
            playbackQualificationId: qualificationId,
          }));
        }
        stopPlayback();
        setHasHeardComplete(true);
        setQualificationNotice("已完整播放当前三音旋律，可以开始填写。 ");
      }, durationMs);
      return durationMs + 100;
    });
    if (playbackError && token === playbackTokenRef.current) {
      invalidateAttempt();
      setAudioError(playbackError);
    }
  };
  const retryCurrentQuestion = () => { resetCurrentQuestion(); void playQuestion(); };
  const chooseNote = (index: number, noteId: string) => {
    if (!hasPlaybackQualificationRef.current) return;
    const nextSelection = selectedNoteIds.map(
      (value, valueIndex) => valueIndex === index ? noteId : value,
    );
    if (!answerLock.choose(nextSelection)) return;
    const completedNoteIds = nextSelection.filter(
      (value): value is string => value !== null,
    );
    if (completedNoteIds.length !== 3) return;
    if (answerMode === "choice") {
      activity.submitChoice(completedNoteIds);
      return;
    }
    const representedAnswer = createFixedSolfegeAnswer(completedNoteIds);
    if (representedAnswer) activity.submitAnswer(representedAnswer);
  };

  const startPianoInput = () => {
    if (!hasPlaybackQualificationRef.current || isAnswerVisible || answerMode !== "piano") return;
    if (
      activity.session.lifecycle !== "ready"
      || activity.session.answer !== undefined
      || activity.session.checkEvidence !== undefined
    ) {
      activity.restart();
      setQualificationNotice("旧 Activity 尝试已重置；请再次点击开始屏幕钢琴作答。 ");
      return;
    }
    pianoInputChannelRef.current?.stop();
    pianoInputEventsRef.current = [];
    pianoToneTokenRef.current += 1;
    pianoInputRunRef.current += 1;
    pianoInputOriginRef.current = createMelodyPianoInputOriginId({
      questionVariantId: question.variantId,
      attemptId: activity.session.attemptId,
      inputRun: pianoInputRunRef.current,
    });
    answerLock.reset();
    setPianoInputArmed(true);
    setQualificationNotice("屏幕钢琴答案输入已开始；请按顺序弹出三个音。 ");
  };

  const playPianoInputTone = async ({
    noteId,
    originId,
    playbackToken,
    toneToken,
  }: {
    noteId: string;
    originId: string;
    playbackToken: number;
    toneToken: number;
  }) => {
    const note = earTrainingMelodyNotes[noteId as EarTrainingMelodyNoteId];
    try {
      const channel = pianoInputChannelRef.current ?? createBrowserAudioChannel();
      pianoInputChannelRef.current = channel;
      const context = await channel.prepareForUserGesture();
      if (
        !mountedRef.current
        || !hasPlaybackQualificationRef.current
        || playbackToken !== playbackTokenRef.current
        || toneToken !== pianoToneTokenRef.current
        || originId !== pianoInputOriginRef.current
      ) return;
      const start = context.currentTime + 0.01;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = note.frequencyHz;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.11, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.3);
      channel.trackSource(oscillator, [gain]);
    } catch {
      if (mountedRef.current && toneToken === pianoToneTokenRef.current) {
        setQualificationNotice("已记录本次屏幕琴键，但当前设备暂时无法发出琴键声音；可以继续检查答案或重播题目。 ");
      }
    }
  };

  const pressPianoKey = (noteId: string, atMs: number) => {
    if (
      !hasPlaybackQualificationRef.current
      || !pianoInputArmed
      || isAnswerVisible
      || pianoInputEventsRef.current.length >= 3
    ) return;
    const note = earTrainingMelodyNotes[noteId as EarTrainingMelodyNoteId];
    const originId = pianoInputOriginRef.current;
    if (!originId) return;
    const midi = noteNameToMidi(note.label);
    if (midi === null) return;
    const event = createScreenPianoActivityNoteOn({
      originId,
      sequence: pianoInputEventsRef.current.length,
      producer: "screen-piano",
      note: midi,
      velocity: 0.72,
      atMs,
    });
    const nextEvents = [...pianoInputEventsRef.current, event];
    const noteIds = adaptMelodyScreenPianoNoteEventsToNoteIds(nextEvents, originId);
    if (!noteIds || noteIds.length !== nextEvents.length) return;
    pianoInputEventsRef.current = nextEvents;
    const nextSelection = EMPTY_MELODY_SELECTION.map((_, index) => noteIds[index] ?? null);
    if (!answerLock.choose(nextSelection)) return;
    const toneToken = pianoToneTokenRef.current;
    void playPianoInputTone({
      noteId,
      originId,
      playbackToken: playbackTokenRef.current,
      toneToken,
    });
    if (noteIds.length !== 3) return;
    setPianoInputArmed(false);
    const pianoAnswer = createMelodyPianoAnswerFromNoteEvents(nextEvents, originId);
    if (pianoAnswer) activity.submitAnswer(pianoAnswer);
    setQualificationNotice("三个屏幕琴键已按顺序记录，输入已自动停止；现在可以检查本轮答案。 ");
  };

  const undoPianoNote = () => {
    if (!hasPlaybackQualificationRef.current || !pianoInputArmed || isAnswerVisible) return;
    if (pianoInputEventsRef.current.length === 0) return;
    pianoToneTokenRef.current += 1;
    pianoInputChannelRef.current?.stop();
    pianoInputEventsRef.current = pianoInputEventsRef.current.slice(0, -1);
    const originId = pianoInputOriginRef.current;
    if (!originId) return;
    const noteIds = adaptMelodyScreenPianoNoteEventsToNoteIds(
      pianoInputEventsRef.current,
      originId,
    );
    if (!noteIds) return;
    const nextSelection = EMPTY_MELODY_SELECTION.map((_, index) => noteIds[index] ?? null);
    answerLock.choose(nextSelection);
  };

  const clearPianoAnswer = () => {
    if (!hasPlaybackQualificationRef.current || isAnswerVisible) return;
    if (pianoInputEventsRef.current.length === 0) return;
    invalidateAttempt("屏幕钢琴输入已清空，旧听题资格与 Activity 尝试已作废；请重新完整播放后再开始。 ");
  };

  const reportLocalAnswerResult = (submittedNoteIds: readonly (string | null)[]) => {
    if (sessionSeed === null || !onLocalAnswerResult) return;
    onLocalAnswerResult({
      target: {
        kind: "melody-dictation",
        difficulty,
        seed: sessionSeed,
        sequence,
        variantId: question.variantId,
      },
      isCorrect: submittedNoteIds.every(
        (noteId, index) => noteId === question.melody.noteIds[index],
      ),
    });
  };

  const chooseStaffNotationNote = (position: number, noteId: EarTrainingMelodyNoteId) => {
    if (
      answerMode !== "staff-notation"
      || !hasPlaybackQualificationRef.current
      || isAnswerVisible
      || !staffNotationDraft
      || staffNotationDraft.reviewState === "confirmed"
    ) return;
    const hadCheckedDraft = staffNotationDraft.reviewState === "checked";
    const nextDraft = setMelodyStaffNotationDraftNote(staffNotationDraft, position, noteId);
    setStaffNotationDraft(nextDraft);
    setStaffNotationDocument(null);
    answerLock.choose([...nextDraft.noteIds]);
    setQualificationNotice(hadCheckedDraft
      ? "谱面草稿已修改，旧检查已失效；请重新检查后再确认。 "
      : "五线谱草稿已更新；请完成三个音高并检查草稿。 ");
  };

  const checkStaffNotationDraft = () => {
    if (!hasPlaybackQualificationRef.current || !staffNotationDraft || isAnswerVisible) return;
    const validation = validateMelodyStaffNotationDraft(staffNotationDraft);
    if (validation.status !== "valid") {
      setQualificationNotice(validation.messages.join(" "));
      return;
    }
    const checkedDraft = checkMelodyStaffNotationDraft(staffNotationDraft);
    setStaffNotationDraft(checkedDraft);
    setQualificationNotice("五线谱草稿结构已检查；可以继续修改，或明确确认当前谱面修订。 ");
  };

  const confirmStaffNotationDraft = () => {
    const qualificationId = staffPlaybackQualificationIdRef.current;
    if (
      !hasPlaybackQualificationRef.current
      || !qualificationId
      || !staffNotationDraft
      || isAnswerVisible
      || !canConfirmMelodyStaffNotationDraft(staffNotationDraft)
      || staffNotationDraft.attemptId !== activity.session.attemptId
      || staffNotationDraft.playbackQualificationId !== qualificationId
    ) {
      setQualificationNotice("当前谱面草稿没有通过本轮完整检查，不能确认；请重新听题并检查。 ");
      return;
    }
    const confirmedDraft = confirmMelodyStaffNotationDraft(staffNotationDraft);
    if (confirmedDraft.reviewState !== "confirmed") return;
    try {
      const document = createScoreDocumentFromMelodyStaffNotationDraft({
        question,
        draft: confirmedDraft,
      });
      const staffAnswer = createMelodyStaffNotationAnswer(document);
      setStaffNotationDraft(confirmedDraft);
      setStaffNotationDocument(document);
      activity.submitAnswer(staffAnswer);
      setQualificationNotice("当前五线谱修订已确认并冻结为本轮会话文档；请主动检查本轮答案。 ");
    } catch {
      setQualificationNotice("当前谱面修订与本题来源不一致，未确认或提交；请清空后重新开始。 ");
    }
  };

  const checkStaffNotationAnswer = () => {
    const qualificationId = staffPlaybackQualificationIdRef.current;
    if (!qualificationId || !staffNotationDocument || !staffNotationDraft) return;
    const evidence = adaptMelodyStaffNotationAnswerToActivityEvidence({
      definition: activityDefinition,
      question,
      document: staffNotationDocument,
      answer: activity.session.answer,
      attemptId: activity.session.attemptId,
      playbackQualificationId: qualificationId,
    });
    if (evidence.state === "insufficient") {
      setQualificationNotice(`${evidence.explanation} 未执行结果揭示或写入复练事实。 `);
      return;
    }
    const submittedNoteIds = answerLock.reveal();
    if (!submittedNoteIds) return;
    activity.completeCheck(evidence);
    reportLocalAnswerResult(submittedNoteIds);
    setQualificationNotice("五线谱答案已完成非评分内容检查；现在显示逐位置对照。 ");
  };

  const clearStaffNotationAnswer = () => {
    if (!hasPlaybackQualificationRef.current || !staffNotationDraft || isAnswerVisible) return;
    invalidateAttempt("五线谱草稿已清空，旧听题资格、谱面修订与 Activity 尝试已作废；请重新完整播放。 ");
  };

  const chooseNumberedNotationNote = (position: number, noteId: EarTrainingMelodyNoteId) => {
    if (
      answerMode !== "numbered-notation"
      || !hasPlaybackQualificationRef.current
      || isAnswerVisible
      || !numberedNotationDraft
      || numberedNotationDraft.reviewState === "confirmed"
    ) return;
    const hadCheckedDraft = numberedNotationDraft.reviewState === "checked";
    const nextDraft = setMelodyNumberedNotationDraftNote(numberedNotationDraft, position, noteId);
    setNumberedNotationDraft(nextDraft);
    setNumberedNotationDocument(null);
    answerLock.choose([...nextDraft.noteIds]);
    setQualificationNotice(hadCheckedDraft
      ? "简谱草稿已修改，旧检查已失效；请重新检查后再确认。 "
      : "简谱草稿已更新；请完成三个音高并检查草稿。 ");
  };

  const checkNumberedNotationDraft = () => {
    if (!hasPlaybackQualificationRef.current || !numberedNotationDraft || isAnswerVisible) return;
    const validation = validateMelodyNumberedNotationDraft(numberedNotationDraft);
    if (validation.status !== "valid") {
      setQualificationNotice(validation.messages.join(" "));
      return;
    }
    const checkedDraft = checkMelodyNumberedNotationDraft(numberedNotationDraft);
    setNumberedNotationDraft(checkedDraft);
    setQualificationNotice("简谱草稿结构已检查；可以继续修改，或明确确认当前简谱修订。 ");
  };

  const confirmNumberedNotationDraft = () => {
    const qualificationId = numberedPlaybackQualificationIdRef.current;
    if (
      !hasPlaybackQualificationRef.current
      || !qualificationId
      || !numberedNotationDraft
      || isAnswerVisible
      || !canConfirmMelodyNumberedNotationDraft(numberedNotationDraft)
      || numberedNotationDraft.attemptId !== activity.session.attemptId
      || numberedNotationDraft.playbackQualificationId !== qualificationId
    ) {
      setQualificationNotice("当前简谱草稿没有通过本轮完整检查，不能确认；请重新听题并检查。 ");
      return;
    }
    const confirmedDraft = confirmMelodyNumberedNotationDraft(numberedNotationDraft);
    if (confirmedDraft.reviewState !== "confirmed") return;
    try {
      const document = createScoreDocumentFromMelodyNumberedNotationDraft({
        question,
        draft: confirmedDraft,
      });
      const numberedAnswer = createMelodyNumberedNotationAnswer(document);
      setNumberedNotationDraft(confirmedDraft);
      setNumberedNotationDocument(document);
      activity.submitAnswer(numberedAnswer);
      setQualificationNotice("当前简谱修订已确认并冻结为本轮会话文档；请主动检查本轮答案。 ");
    } catch {
      setQualificationNotice("当前简谱修订与本题来源不一致，未确认或提交；请清空后重新开始。 ");
    }
  };

  const checkNumberedNotationAnswer = () => {
    const qualificationId = numberedPlaybackQualificationIdRef.current;
    if (!qualificationId || !numberedNotationDocument || !numberedNotationDraft) return;
    const evidence = adaptMelodyNumberedNotationAnswerToActivityEvidence({
      definition: activityDefinition,
      question,
      document: numberedNotationDocument,
      answer: activity.session.answer,
      attemptId: activity.session.attemptId,
      playbackQualificationId: qualificationId,
    });
    if (evidence.state === "insufficient") {
      setQualificationNotice(`${evidence.explanation} 未执行结果揭示或写入复练事实。 `);
      return;
    }
    const submittedNoteIds = answerLock.reveal();
    if (!submittedNoteIds) return;
    activity.completeCheck(evidence);
    reportLocalAnswerResult(submittedNoteIds);
    setQualificationNotice("简谱答案已完成非评分内容检查；现在显示逐位置对照。 ");
  };

  const clearNumberedNotationAnswer = () => {
    if (!hasPlaybackQualificationRef.current || !numberedNotationDraft || isAnswerVisible) return;
    invalidateAttempt("简谱草稿已清空，旧听题资格、简谱修订与 Activity 尝试已作废；请重新完整播放。 ");
  };

  const revealAnswer = () => {
    const completedCurrentNoteIds = selectedNoteIds.filter(
      (value): value is string => value !== null,
    );
    let representedAnswer: ActivityAnswer | undefined;
    let representedEvidence: ActivityCheckEvidence | undefined;
    if (answerMode === "solfege") {
      representedAnswer = createFixedSolfegeAnswer(completedCurrentNoteIds) ?? undefined;
      if (representedAnswer) {
        representedEvidence = adaptFixedSolfegeAnswerToActivityEvidence({
          definition: activityDefinition,
          answer: representedAnswer,
        });
      }
    } else if (answerMode === "piano") {
      const originId = pianoInputOriginRef.current;
      representedAnswer = originId
        ? createMelodyPianoAnswerFromNoteEvents(pianoInputEventsRef.current, originId) ?? undefined
        : undefined;
      if (representedAnswer) {
        representedEvidence = adaptMelodyPianoAnswerToActivityEvidence({
          definition: activityDefinition,
          answer: representedAnswer,
        });
      }
    }
    if (
      answerMode !== "choice"
      && (!representedAnswer || !representedEvidence || representedEvidence.state === "insufficient")
    ) {
      setQualificationNotice("当前答案事件与 Activity 尝试不一致，未执行检查或写入复练事实；请清空后重新开始。 ");
      return;
    }
    const submittedNoteIds = answerLock.reveal();
    if (!submittedNoteIds) return;
    const completedNoteIds = submittedNoteIds.filter(
      (value): value is string => value !== null,
    );
    if (answerMode === "choice") {
      activity.checkChoice(completedNoteIds);
    } else if (representedAnswer && representedEvidence) {
      activity.checkAnswer(representedAnswer, representedEvidence);
    }
    reportLocalAnswerResult(submittedNoteIds);
  };
  const nextQuestion = () => {
    resetCurrentQuestion();
    if (initialReviewTarget && onLeaveReviewTarget) onLeaveReviewTarget();
    else setSequence((current) => current + 1);
  };

  const changePracticeMode = (nextMode: MelodyPracticeMode) => {
    if (nextMode === practiceMode || (nextMode === "imitation" && !pianoAnswerAvailable)) return;
    clearQualification();
    answerLock.reset();
    activity.restart();
    setAudioError("");
    setQualificationNotice("");
    setIsLocalPianoOpen(false);
    setImitationEpoch((current) => current + 1);
    stopAllBrowserAudio();
    setPracticeMode(nextMode);
  };

  const changeDifficulty = (nextDifficulty: EarTrainingMelodyDictationDifficulty) => {
    clearQualification();
    answerLock.reset();
    activity.restart();
    setAudioError("");
    setQualificationNotice("难度已切换；旧填写与听题资格已清除，请重新完整播放。 ");
    setIsLocalPianoOpen(false);
    setImitationEpoch((current) => current + 1);
    stopAllBrowserAudio();
    setDifficulty(nextDifficulty);
    setSequence(0);
  };

  const resetImitationQuestion = () => {
    setImitationEpoch((current) => current + 1);
    stopAllBrowserAudio();
  };

  const nextImitationQuestion = () => {
    setImitationEpoch((current) => current + 1);
    stopAllBrowserAudio();
    setSequence((current) => current + 1);
  };

  const changeAnswerMode = (nextMode: MelodyAnswerMode) => {
    if (nextMode === answerMode) return;
    if (nextMode === "piano" && !pianoAnswerAvailable) return;
    if (nextMode === "staff-notation" && !staffNotationAnswerAvailable) return;
    if (nextMode === "numbered-notation" && !numberedNotationAnswerAvailable) return;
    clearQualification();
    answerLock.reset();
    activity.restart();
    setAudioError("");
    setQualificationNotice("答案方式已切换；旧填写与听题资格已清除，请重新完整播放。 ");
    setAnswerMode(nextMode);
  };

  const customAnswerNoteIds = useMemo(() => activeCustomPractice
    ? Array.from(new Set(activeCustomPractice.variantIds.flatMap((variantId, index) =>
        createLocalEarTrainingMelodyQuestion({
          difficulty,
          sequence: index,
          variantId,
          catalogMode,
        }).melody.noteIds,
      ))) as EarTrainingMelodyNoteId[]
    : undefined, [activeCustomPractice, catalogMode, difficulty]);
  const availableAnswerNoteIds = customAnswerNoteIds ?? getEarTrainingMelodyNoteIds(difficulty, catalogMode);
  const answerOptions = availableAnswerNoteIds.map(
    (noteId) => answerMode === "choice"
      ? earTrainingMelodyNotes[noteId]
      : { id: noteId, label: getFixedSolfegeLabel(noteId) },
  );

  const selectedAnswerLabel = answer.selectedNoteIds.map((noteId) => {
    if (!noteId) return "未选择";
    if (answerMode === "solfege") return getFixedSolfegeLabel(noteId);
    if (answerMode === "numbered-notation") {
      return getMelodyNumberedNotationPresentation(noteId as EarTrainingMelodyNoteId).optionLabel;
    }
    return earTrainingMelodyNotes[noteId as keyof typeof earTrainingMelodyNotes].label;
  }).join(" → ");

  const expectedAnswerLabel = answer.answerNoteIds.map((noteId) => {
    if (answerMode === "solfege") return getFixedSolfegeLabel(noteId);
    if (answerMode === "numbered-notation") {
      return getMelodyNumberedNotationPresentation(noteId as EarTrainingMelodyNoteId).optionLabel;
    }
    return earTrainingMelodyNotes[noteId as keyof typeof earTrainingMelodyNotes].label;
  }).join(" → ");

  return <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <p className="text-sm font-semibold tracking-wide text-violet-600">{numberedNotationAnswerAvailable ? "P117c · 本地旋律听写" : "本地练习"}</p>
    <h2 className="mt-1 text-2xl font-bold text-slate-950">内置旋律听写练习</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">先完整听完三音短旋律，再按听到的顺序使用音名、固定唱名{pianoAnswerAvailable ? "、屏幕钢琴、五线谱或固定 C 简谱" : ""}作答。本模块不上传音频，也不生成正式成绩。{onLocalAnswerResult ? "当前填写、谱面草稿和声音不保存；答错时仅保存复现本题所需的最小信息。" : "当前入口不会保存练习记录。"}</p>
    {pianoAnswerAvailable ? <div className="mt-4 grid grid-cols-2 gap-2" data-testid="melody-practice-mode">
      <button type="button" role="radio" aria-checked={practiceMode === "dictation"} onClick={() => changePracticeMode("dictation")} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-bold ${practiceMode === "dictation" ? "border-violet-600 bg-violet-50 text-violet-950 ring-2 ring-violet-200" : "border-slate-200 bg-white text-slate-700"}`}>旋律听写</button>
      <button type="button" role="radio" aria-checked={practiceMode === "imitation"} onClick={() => changePracticeMode("imitation")} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-bold ${practiceMode === "imitation" ? "border-cyan-700 bg-cyan-50 text-cyan-950 ring-2 ring-cyan-200" : "border-slate-200 bg-white text-slate-700"}`}>旋律回唱（麦克风）</button>
    </div> : null}
    {!imitationModeActive ? <>
    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-100">
        <label className="block text-sm font-semibold text-slate-800" htmlFor="ear-training-melody-difficulty">练习难度</label>
        <select id="ear-training-melody-difficulty" disabled={Boolean(initialReviewTarget || activeCustomPractice)} className="mt-2 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100" value={difficulty} onChange={(event) => changeDifficulty(event.target.value as EarTrainingMelodyDictationDifficulty)}>
          <option value="基础">基础：自然音级进与小跳</option><option value="进阶">进阶：增加 A4 与较大跳进</option>{expandedLocalCatalog ? <option value="挑战">挑战：扩展音域、半音与复合跳进</option> : null}
        </select>
        <p className="mt-4 text-sm leading-6 text-violet-900">当前为内置题目 {sequence + 1}，本难度共 {variantCount} 个版本化组合。本轮题库会随机排序，全部出现一次后循环；当前填写不保存。三个音由浏览器本地 Web Audio 依次合成，不读取文件、不调用接口。</p>
        {!isQuestionReady ? <p className="mt-2 text-sm text-violet-800">正在准备本轮题目…</p> : null}
        <button type="button" onClick={() => void playQuestion()} disabled={!isQuestionReady || isPlaying} className="mt-4 w-full rounded-xl bg-violet-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-violet-300">{playbackState === "准备中" ? "正在准备声音…" : isPlaying ? "正在播放短旋律…" : "播放旋律题目"}</button>
        <button type="button" onClick={() => invalidateAttempt("本轮播放已手动停止并作废；旧填写与检查已清除，请重新完整播放。 ")} disabled={!isPlaying} className="mt-2 w-full rounded-xl border border-violet-300 bg-white px-4 py-3 font-semibold text-violet-800 disabled:cursor-not-allowed disabled:opacity-50">停止并作废播放</button>
        {audioError ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-800">{audioError}</p> : null}
        <p className="mt-3 text-sm font-semibold text-violet-950" aria-live="polite">状态：{isPlaying ? "正在播放" : hasHeardComplete ? "可以填写" : "等待完整播放"}</p>
        {qualificationNotice ? <p className="mt-2 rounded-xl bg-white p-3 text-sm leading-6 text-violet-900 ring-1 ring-violet-200">{qualificationNotice}</p> : null}
      </div>
      <div className="rounded-2xl border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-500">回答本题</p><p className="mt-1 text-lg font-bold text-slate-950">按播放顺序填写三个音</p>
        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-slate-700">答案方式</legend>
          <div className={`mt-2 grid gap-2 ${numberedNotationAnswerAvailable ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`} data-testid="melody-answer-mode">
            <button type="button" role="radio" aria-checked={answerMode === "choice"} onClick={() => changeAnswerMode("choice")} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold ${answerMode === "choice" ? "border-violet-600 bg-violet-50 text-violet-900 ring-2 ring-violet-200" : "border-slate-200 text-slate-700"}`}>音名</button>
            <button type="button" role="radio" aria-checked={answerMode === "solfege"} onClick={() => changeAnswerMode("solfege")} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold ${answerMode === "solfege" ? "border-violet-600 bg-violet-50 text-violet-900 ring-2 ring-violet-200" : "border-slate-200 text-slate-700"}`}>固定唱名</button>
            {pianoAnswerAvailable ? <button type="button" role="radio" aria-checked={answerMode === "piano"} onClick={() => changeAnswerMode("piano")} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold ${answerMode === "piano" ? "border-violet-600 bg-violet-50 text-violet-900 ring-2 ring-violet-200" : "border-slate-200 text-slate-700"}`}>屏幕钢琴</button> : null}
            {staffNotationAnswerAvailable ? <button type="button" role="radio" aria-checked={answerMode === "staff-notation"} onClick={() => changeAnswerMode("staff-notation")} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold ${answerMode === "staff-notation" ? "border-violet-600 bg-violet-50 text-violet-900 ring-2 ring-violet-200" : "border-slate-200 text-slate-700"}`}>五线谱</button> : null}
            {numberedNotationAnswerAvailable ? <button type="button" role="radio" aria-checked={answerMode === "numbered-notation"} onClick={() => changeAnswerMode("numbered-notation")} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold ${answerMode === "numbered-notation" ? "border-violet-600 bg-violet-50 text-violet-900 ring-2 ring-violet-200" : "border-slate-200 text-slate-700"}`}>简谱</button> : null}
          </div>
        </fieldset>
        <p className="mt-3 text-sm leading-6 text-slate-600">{answerMode === "choice" ? "使用科学音高名填写，例如 C4、F♯4。" : answerMode === "solfege" ? "使用固定唱名填写；低音区 do 与高音 do 会明确区分，升 fa 表示 F♯。" : answerMode === "piano" ? "完整听题后，先明确开始接收，再按顺序弹出三个屏幕琴键；允许重复音，琴键会在本机短暂发声。" : answerMode === "staff-notation" ? "完整听题后，在受控高音谱表中编辑三个音高；先检查草稿，再明确确认当前谱面修订，最后主动检查答案。" : "完整听题后，按固定 C 为 1 编辑三个简谱音高；升号在数字左侧，高八度点在数字上方。先检查、确认，再主动检查答案。"}</p>
        {answerMode === "piano" ? (
          <div className="mt-4" data-testid="melody-piano-answer">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-700">当前输入：{selectedAnswerLabel}</p>
              <p className="text-sm font-semibold text-violet-800">已接收 {pianoInputEventsRef.current.length} / 3 个音</p>
            </div>
            <button type="button" disabled={!isQuestionReady || !hasHeardComplete || isAnswerVisible || pianoInputArmed || selectedNoteIds.some((noteId) => noteId !== null)} onClick={startPianoInput} className="mt-3 w-full rounded-xl bg-violet-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{pianoInputArmed ? "正在接收屏幕琴键…" : "开始屏幕钢琴作答"}</button>
            <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-9" aria-label="旋律听写屏幕钢琴">
              {availableAnswerNoteIds.map((noteId) => {
                const note = earTrainingMelodyNotes[noteId];
                const blackKey = noteId.includes("sharp");
                return <button key={noteId} type="button" disabled={!isQuestionReady || !hasHeardComplete || !pianoInputArmed || isAnswerVisible || answer.hasSelection} onClick={(event) => pressPianoKey(noteId, event.timeStamp)} className={`min-h-20 rounded-b-xl border px-2 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${blackKey ? "border-slate-950 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-900 shadow-sm"}`}>{note.label}</button>;
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={!hasHeardComplete || !pianoInputArmed || isAnswerVisible || !selectedNoteIds.some((noteId) => noteId !== null)} onClick={undoPianoNote} className="rounded-xl border border-violet-300 bg-white px-3 py-2 font-semibold text-violet-900 disabled:opacity-50">撤销最后一个音</button>
              <button type="button" disabled={!hasHeardComplete || isAnswerVisible || !selectedNoteIds.some((noteId) => noteId !== null)} onClick={clearPianoAnswer} className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-800 disabled:opacity-50">清空并重新听题</button>
            </div>
          </div>
        ) : answerMode === "staff-notation" ? (
          <div className="mt-4 space-y-3" data-testid="melody-staff-notation-answer">
            <MelodyStaffNotationInput
              noteIds={staffNotationDraft?.noteIds ?? [null, null, null]}
              availableNoteIds={availableAnswerNoteIds}
              disabled={!isQuestionReady || !hasHeardComplete || !staffNotationDraft || isAnswerVisible}
              locked={isAnswerVisible || staffNotationDraft?.reviewState === "confirmed"}
              reviewState={staffNotationDraft?.reviewState ?? "waiting"}
              onChoose={chooseStaffNotationNote}
              onCheck={checkStaffNotationDraft}
              onConfirm={confirmStaffNotationDraft}
              onClear={clearStaffNotationAnswer}
            />
            <button type="button" disabled={!staffNotationDocument || activity.session.lifecycle !== "answering" || isAnswerVisible} onClick={checkStaffNotationAnswer} className="min-h-11 w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">检查本轮五线谱答案</button>
          </div>
        ) : answerMode === "numbered-notation" ? (
          <div className="mt-4 space-y-3" data-testid="melody-numbered-notation-answer">
            <MelodyNumberedNotationInput
              noteIds={numberedNotationDraft?.noteIds ?? [null, null, null]}
              availableNoteIds={availableAnswerNoteIds}
              disabled={!isQuestionReady || !hasHeardComplete || !numberedNotationDraft || isAnswerVisible}
              locked={isAnswerVisible || numberedNotationDraft?.reviewState === "confirmed"}
              reviewState={numberedNotationDraft?.reviewState ?? "waiting"}
              onChoose={chooseNumberedNotationNote}
              onCheck={checkNumberedNotationDraft}
              onConfirm={confirmNumberedNotationDraft}
              onClear={clearNumberedNotationAnswer}
            />
            <button type="button" disabled={!numberedNotationDocument || activity.session.lifecycle !== "answering" || isAnswerVisible} onClick={checkNumberedNotationAnswer} className="min-h-11 w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">检查本轮简谱答案</button>
          </div>
        ) : <ActivityOrderedChoiceAnswerPanel
            positionLabels={["第 1 个音", "第 2 个音", "第 3 个音"]}
            options={answerOptions}
            selectedOptionIds={selectedNoteIds}
            disabled={!isQuestionReady || !hasHeardComplete || isAnswerVisible}
            onChoose={chooseNote}
          />}
        <div className="mt-4 flex flex-wrap gap-2">{answerMode !== "staff-notation" && answerMode !== "numbered-notation" ? <button type="button" disabled={!isQuestionReady || !answer.hasSelection || isAnswerVisible} onClick={revealAnswer} className="rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{answerMode === "piano" ? "检查本轮钢琴答案" : "查看本题答案"}</button> : null}{isAnswerVisible && !answer.matchesAnswer ? <button type="button" onClick={retryCurrentQuestion} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 font-semibold text-amber-900">重新播放并复练本题</button> : null}<button type="button" onClick={resetCurrentQuestion} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-800">重置本题</button><button type="button" disabled={!isQuestionReady} onClick={nextQuestion} className="rounded-xl border border-violet-300 bg-white px-4 py-2.5 font-semibold text-violet-800 disabled:cursor-not-allowed disabled:opacity-50">{initialReviewTarget ? "返回随机练习" : "下一题"}</button></div>
        {!hasHeardComplete ? <p className="mt-3 text-sm leading-6 text-slate-500">必须完整播放当前题目后才能填写；重播、停止、后台或全局停止会清除旧填写与检查。</p> : !answer.hasSelection ? <p className="mt-3 text-sm leading-6 text-slate-500">请为三个位置都选择{answerMode === "choice" ? "音名" : answerMode === "solfege" ? "固定唱名" : answerMode === "piano" ? "屏幕琴键" : answerMode === "staff-notation" ? "五线谱音高" : "简谱音高"}，再完成本轮检查。</p> : null}
        <ActivityProtocolState session={activity.session} />
        {isAnswerVisible ? <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"><p className="font-bold text-slate-950">本题答案：{expectedAnswerLabel}</p><p className="mt-1">{answer.explanation}</p><p className="mt-2">你的填写：{selectedAnswerLabel}。{answer.matchesAnswer ? "这次填写与本题答案一致。" : "这次填写与本题答案不同；可以再次播放并重置本题复练。"}</p>{answerMode === "piano" || answerMode === "staff-notation" || answerMode === "numbered-notation" ? <ol className="mt-3 grid gap-2 sm:grid-cols-3" data-testid={answerMode === "piano" ? "melody-piano-position-comparison" : answerMode === "staff-notation" ? "melody-staff-position-comparison" : "melody-numbered-position-comparison"}>{answer.answerNoteIds.map((expectedNoteId, index) => { const actualNoteId = answer.selectedNoteIds[index]; const matches = actualNoteId === expectedNoteId; const expectedLabel = answerMode === "numbered-notation" ? getMelodyNumberedNotationPresentation(expectedNoteId as EarTrainingMelodyNoteId).optionLabel : earTrainingMelodyNotes[expectedNoteId as EarTrainingMelodyNoteId].label; const actualLabel = actualNoteId ? answerMode === "numbered-notation" ? getMelodyNumberedNotationPresentation(actualNoteId as EarTrainingMelodyNoteId).optionLabel : earTrainingMelodyNotes[actualNoteId as EarTrainingMelodyNoteId].label : "未填写"; return <li key={`${expectedNoteId}-${index}`} className={`rounded-xl p-3 ${matches ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"}`}><span className="font-bold">第 {index + 1} 个音</span><br />目标 {expectedLabel} · 填写 {actualLabel}<br />{matches ? "位置一致" : "位置不同"}</li>; })}</ol> : null}<p className="mt-2 text-slate-500">答案说明显示后，本题填写已锁定；请使用复练或下一题开始新的尝试。这不是正式分数、准确率、等级、通过或失败判断。</p></div> : null}
      </div>
    </div>
    {showLocalPiano && answerMode !== "piano" ? (
      <section className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4" aria-label="旋律听写参考钢琴">
        <button type="button" aria-expanded={isLocalPianoOpen} aria-controls="melody-reference-piano" onClick={() => setIsLocalPianoOpen((current) => !current)} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-left font-bold text-rose-950 ring-1 ring-rose-200">
          <span>参考钢琴</span><span className="text-sm">{isLocalPianoOpen ? "收起" : "展开"}</span>
        </button>
        <p className="mt-2 text-sm leading-6 text-rose-900">仅用于本地找音。弹奏不保存、不上传，也不生成分数或正式评分。</p>
        {isLocalPianoOpen ? <div id="melody-reference-piano" className="mt-4"><LocalPianoPanel /></div> : null}
      </section>
    ) : null}
    </> : <>
      <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4" data-testid="melody-imitation-question-controls">
        <label className="block text-sm font-semibold text-cyan-950" htmlFor="melody-imitation-difficulty">回唱难度</label>
        <select id="melody-imitation-difficulty" className="mt-2 w-full rounded-xl border border-cyan-200 bg-white px-3 py-2 text-slate-900" value={difficulty} onChange={(event) => changeDifficulty(event.target.value as EarTrainingMelodyDictationDifficulty)}>
          <option value="基础">基础：自然音级进与小跳</option><option value="进阶">进阶：增加 A4 与较大跳进</option><option value="挑战">挑战：扩展音域、半音与复合跳进</option>
        </select>
        <p className="mt-3 text-sm leading-6 text-cyan-900">当前为回唱题目 {sequence + 1}。切换难度、重置或下一题都会立即停止并作废旧播放、麦克风、录音与分析。</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={resetImitationQuestion} className="min-h-11 rounded-xl border border-cyan-300 bg-white px-4 py-2 text-sm font-bold text-cyan-950">重置回唱题目</button>
          <button type="button" disabled={!isQuestionReady} onClick={nextImitationQuestion} className="min-h-11 rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-bold text-violet-900 disabled:opacity-50">下一组回唱</button>
        </div>
      </div>
      <LocalMelodyImitationPanel key={`melody-imitation:${question.id}:${imitationEpoch}`} question={question} />
    </>}
    <p className="mt-5 text-sm leading-6 text-slate-500">{onLocalAnswerResult ? "本机复练只保存复现这道题所需的题型、难度和随机题序，不保存你的填写、声音或正式成绩。" : "会话边界：题目序号、填写与答案说明只存在于当前页面内存；刷新后消失，不写入 localStorage、IndexedDB、账号或数据库。"}</p>
  </section>;
}
