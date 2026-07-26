"use client";

import { useMemo, type KeyboardEvent } from "react";

import {
  createLocalScoreProjectNumberedPresentation,
  type LocalScoreNumberedToken,
} from "../../lib/music/localScoreProjectNumberedPresentation";
import type {
  LocalNotationProjectScoreDocumentV3,
  LocalNotationProjectScoreDocumentV4,
  LocalNotationProjectScoreDocumentV5,
} from "../../lib/music/scoreDocument";
import {
  getLocalScoreProjectVoiceIdentityLabel,
  type LocalScoreProjectVoiceTarget,
} from "../../lib/music/localScoreProjectStaffPresentation";
import type {
  LocalScoreProjectStaffSelection,
} from "./LocalScoreProjectStaffPreview";

export type LocalScoreProjectNumberedPreviewProps = Readonly<{
  document:
    | LocalNotationProjectScoreDocumentV3
    | LocalNotationProjectScoreDocumentV4
    | LocalNotationProjectScoreDocumentV5;
  selectedEventId?: string | null;
  activeEventIds?: readonly string[];
  target?: LocalScoreProjectVoiceTarget;
  onSelectEvent?: (selection: LocalScoreProjectStaffSelection) => void;
}>;

const activateToken = ({
  event,
  token,
  onSelectEvent,
}: {
  event: KeyboardEvent<HTMLDivElement>;
  token: LocalScoreNumberedToken;
  onSelectEvent: NonNullable<
    LocalScoreProjectNumberedPreviewProps["onSelectEvent"]
  >;
}) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  onSelectEvent({ eventId: token.eventId, location: token.location });
};

export function LocalScoreProjectNumberedPreview({
  document,
  selectedEventId = null,
  activeEventIds = [],
  target,
  onSelectEvent,
}: LocalScoreProjectNumberedPreviewProps) {
  const presentation = useMemo(
    () => createLocalScoreProjectNumberedPresentation(document, target),
    [document, target],
  );
  const activeIds = useMemo(() => new Set(activeEventIds), [activeEventIds]);

  if (presentation.status === "blocked") {
    return (
      <section
        className="rounded-2xl border border-rose-200 bg-rose-50 p-4"
        aria-label={target
          ? `当前声部固定 C 简谱预览（${getLocalScoreProjectVoiceIdentityLabel(target)}）`
          : "当前声部固定 C 简谱预览（默认第一声部组／谱表／声部）"}
      >
        <p className="text-sm text-rose-900" role="alert">
          {presentation.reason}
        </p>
      </section>
    );
  }

  const summary = presentation.tokens.length === 0
    ? "当前没有音符或休止符"
    : presentation.tokens.map((token) => token.accessibleLabel).join("；");
  const voiceIdentity = getLocalScoreProjectVoiceIdentityLabel({
    partId: presentation.partId,
    staffId: presentation.staffId,
    voiceId: presentation.voiceId,
  });

  return (
    <section
      className="rounded-2xl border border-sky-200 bg-white p-4"
      aria-label={`当前声部固定 C 简谱（${voiceIdentity}）`}
      data-testid="local-score-project-numbered-preview"
      data-document-id={presentation.documentId}
      data-document-revision={presentation.revision}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-slate-950">
            当前声部固定 C 简谱（{voiceIdentity}）
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            固定 C 为 1，不随当前调号（{presentation.keySignatureLabel}）变化；蓝框表示选择，琥珀色表示当前播放事件。
          </p>
        </div>
        <p className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-900">
          1 = C · 调号{presentation.keySignatureLabel} · {presentation.meter}
        </p>
      </div>

      <div
        className="mt-4 overflow-x-auto rounded-xl border border-sky-100 bg-sky-50/40 p-3"
        role="group"
        aria-label={`当前声部固定 C 简谱预览（${voiceIdentity}），当前谱面调号${presentation.keySignatureLabel}，固定 C 音级不随调号变化，拍号 ${presentation.meter}，共 ${presentation.measures.length} 小节。${summary}。`}
      >
        <div className="flex min-w-max items-stretch">
          {presentation.measures.map((measure) => (
            <div
              key={measure.measureNumber}
              className="flex min-w-52 items-center border-r-2 border-slate-500 px-3 py-5 first:border-l-2"
              data-measure-number={measure.measureNumber}
            >
              <span
                className="mr-2 self-start text-xs font-semibold text-slate-500"
                aria-hidden="true"
              >
                {measure.measureNumber}
              </span>
              <div className="flex items-start gap-2">
                {measure.tokens.map((token) => {
                  const selected = token.eventId === selectedEventId;
                  const active = activeIds.has(token.eventId);
                  const stateLabel = [
                    token.accessibleLabel,
                    selected ? "已选择" : null,
                    active ? "正在播放" : null,
                  ].filter(Boolean).join("，");
                  return (
                    <div
                      key={token.eventId}
                      role={onSelectEvent ? "button" : "img"}
                      tabIndex={onSelectEvent ? 0 : undefined}
                      aria-label={stateLabel}
                      aria-pressed={onSelectEvent ? selected : undefined}
                      aria-current={active ? "true" : undefined}
                      data-event-id={token.eventId}
                      data-selected={selected ? "true" : "false"}
                      data-active={active ? "true" : "false"}
                      onClick={onSelectEvent
                        ? () => onSelectEvent({
                          eventId: token.eventId,
                          location: token.location,
                        })
                        : undefined}
                      onKeyDown={onSelectEvent
                        ? (event) => activateToken({
                          event,
                          token,
                          onSelectEvent,
                        })
                        : undefined}
                      className={`relative min-w-14 rounded-xl border-2 px-2 py-3 text-center ${
                        selected
                          ? "border-indigo-700 bg-indigo-50"
                          : active
                            ? "border-amber-500 bg-amber-100"
                            : "border-transparent bg-white"
                      }`}
                    >
                      {active ? (
                        <span
                          className="absolute inset-y-2 left-1 w-0.5 rounded bg-amber-600"
                          data-testid={`local-score-numbered-playback-cursor-${token.eventId}`}
                          aria-hidden="true"
                        />
                      ) : null}
                      <span className="relative inline-flex min-h-10 items-end justify-center pt-3 font-serif text-3xl font-bold leading-none text-sky-950">
                        {token.type === "note" && token.octave === "upper" ? (
                          <span
                            className="absolute left-1/2 top-0 -translate-x-1/2 text-xl"
                            data-testid={`local-score-numbered-octave-dot-${token.eventId}`}
                            aria-hidden="true"
                          >
                            ·
                          </span>
                        ) : null}
                        <span
                          className={token.underlineCount === 1
                            ? "border-b-2 border-sky-950"
                            : ""}
                          data-testid={`local-score-numbered-degree-${token.eventId}`}
                          aria-hidden="true"
                        >
                          {token.degree}
                        </span>
                        {token.augmentationDots === 1 ? (
                          <span
                            className="ml-0.5 text-xl"
                            data-testid={`local-score-numbered-augmentation-dot-${token.eventId}`}
                            aria-hidden="true"
                          >
                            ·
                          </span>
                        ) : null}
                        {token.sustainDashes === 1 ? (
                          <span
                            className="ml-1"
                            data-testid={`local-score-numbered-sustain-${token.eventId}`}
                            aria-hidden="true"
                          >
                            —
                          </span>
                        ) : null}
                      </span>
                      {token.type === "note" && token.tieToNext ? (
                        <span
                          className="mt-1 block text-lg leading-none text-violet-700"
                          data-testid={`local-score-numbered-tie-${token.eventId}-${token.tieTargetEventId}`}
                          aria-hidden="true"
                        >
                          ⌒
                        </span>
                      ) : null}
                      {token.type === "note" && token.lyric !== null ? (
                        <span
                          className="mt-1 block text-xs text-slate-600"
                          data-testid={`local-score-numbered-lyric-${token.eventId}`}
                          aria-hidden="true"
                        >
                          {token.lyric}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {presentation.tokens.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">
          当前声部（{voiceIdentity}）没有音符或休止符。
        </p>
      ) : null}
      {presentation.warnings.length > 0 ? (
        <p className="mt-3 text-xs leading-5 text-amber-900">
          {presentation.warnings.join(" ")}
        </p>
      ) : null}
    </section>
  );
}
