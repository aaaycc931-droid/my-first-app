"use client";

import { useMemo, type KeyboardEvent } from "react";

import {
  createLocalScoreProjectStaffPresentation,
  getLocalScoreProjectVoiceIdentityLabel,
  type LocalScoreProjectVoiceTarget,
  type LocalScoreStaffEventLocation,
  type LocalScoreStaffToken,
} from "../../lib/music/localScoreProjectStaffPresentation";
import type {
  LocalNotationProjectScoreDocumentV3,
  LocalNotationProjectScoreDocumentV4,
  LocalNotationProjectScoreDocumentV5,
  LocalNotationProjectScoreDocumentV6,
  LocalNotationProjectScoreDocumentV7,
  LocalNotationProjectScoreDocumentV8,
  LocalNotationProjectScoreDocumentV9,
  LocalNotationProjectScoreDocumentV10,
  LocalNotationProjectScoreDocumentV11,
} from "../../lib/music/scoreDocument";

export type LocalScoreProjectStaffSelection = Readonly<{
  eventId: string;
  location: LocalScoreStaffEventLocation;
}>;

export type LocalScoreProjectStaffPreviewProps = Readonly<{
  document:
    | LocalNotationProjectScoreDocumentV3
    | LocalNotationProjectScoreDocumentV4
    | LocalNotationProjectScoreDocumentV5
    | LocalNotationProjectScoreDocumentV6
    | LocalNotationProjectScoreDocumentV7
    | LocalNotationProjectScoreDocumentV8
    | LocalNotationProjectScoreDocumentV9
    | LocalNotationProjectScoreDocumentV10
    | LocalNotationProjectScoreDocumentV11;
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
  event: KeyboardEvent<SVGGElement>;
  token: LocalScoreStaffToken;
  onSelectEvent: NonNullable<
    LocalScoreProjectStaffPreviewProps["onSelectEvent"]
  >;
}) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  onSelectEvent({ eventId: token.eventId, location: token.location });
};

export function LocalScoreProjectStaffPreview({
  document,
  selectedEventId = null,
  activeEventIds = [],
  target,
  onSelectEvent,
}: LocalScoreProjectStaffPreviewProps) {
  const presentation = useMemo(
    () => createLocalScoreProjectStaffPresentation(document, target),
    [document, target],
  );
  const activeIds = useMemo(() => new Set(activeEventIds), [activeEventIds]);

  if (presentation.status === "blocked") {
    return (
      <section
        className="rounded-2xl border border-rose-200 bg-rose-50 p-4"
        aria-label={target
          ? `当前声部五线谱预览（${getLocalScoreProjectVoiceIdentityLabel(target)}）`
          : "当前声部五线谱预览（默认第一声部组／谱表／声部）"}
      >
        <p className="text-sm text-rose-900" role="alert">
          {presentation.reason}
        </p>
      </section>
    );
  }

  const eventSummary = presentation.tokens.length === 0
    ? "当前没有音符或休止符"
    : presentation.tokens.map((token) => token.accessibleLabel).join("；");
  const voiceIdentity = getLocalScoreProjectVoiceIdentityLabel({
    partId: presentation.partId,
    staffId: presentation.staffId,
    voiceId: presentation.voiceId,
  });
  const previewLabel =
    `当前声部五线谱预览（${voiceIdentity}），${presentation.clefLabel}，`
    + `调号${presentation.keySignatureLabel}，拍号 ${presentation.meter}，`
    + `共 ${presentation.measures.length} 小节。${eventSummary}。`;
  const tokenById = new Map(
    presentation.tokens.map((token) => [token.eventId, token]),
  );
  const creatorLines = ([
    ["composer", "作曲"],
    ["lyricist", "作词"],
    ["arranger", "编曲"],
  ] as const).map(([role, label]) => ({
    role,
    label,
    names: presentation.scoreCredits.creators
      .filter((creator) => creator.role === role)
      .map((creator) => creator.name),
  })).filter(({ names }) => names.length > 0);
  const hasCredits = presentation.scoreCredits.title !== null
    || presentation.scoreCredits.subtitle !== null
    || creatorLines.length > 0
    || presentation.scoreCredits.rightsNotice !== null;

  return (
    <section
      className="rounded-2xl border border-indigo-200 bg-white p-4"
      aria-label={`当前声部图形五线谱（${voiceIdentity}）`}
      data-testid="local-score-project-staff-preview"
    >
      {hasCredits ? (
        <header
          className="mb-4 border-b border-indigo-100 pb-4 text-center"
          data-testid="local-score-project-score-credits"
        >
          {presentation.scoreCredits.title !== null ? (
            <h2 className="text-xl font-black text-slate-950">
              {presentation.scoreCredits.title}
            </h2>
          ) : null}
          {presentation.scoreCredits.subtitle !== null ? (
            <p className="mt-1 text-sm text-slate-600">
              {presentation.scoreCredits.subtitle}
            </p>
          ) : null}
          {creatorLines.length > 0 ? (
            <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-700">
              {creatorLines.map(({ role, label, names }) => (
                <p key={role}>{label}：{names.join("、")}</p>
              ))}
            </div>
          ) : null}
          {presentation.scoreCredits.rightsNotice !== null ? (
            <p className="mt-2 text-xs text-slate-500">
              {presentation.scoreCredits.rightsNotice}
            </p>
          ) : null}
        </header>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-slate-950">
            当前声部图形预览（{voiceIdentity}）
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            图形来自当前已保存修订；蓝框表示选择，琥珀色表示当前播放事件。
          </p>
        </div>
        <p className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-900">
          {presentation.clefLabel} · 调号{presentation.keySignatureLabel} · {presentation.meter}
        </p>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-indigo-100 bg-indigo-50/40 p-2">
        <svg
          viewBox={`0 0 ${presentation.width} ${presentation.height}`}
          width={presentation.width}
          height={presentation.height}
          role="group"
          aria-label={previewLabel}
          className="block h-auto max-w-none"
          data-document-id={presentation.documentId}
          data-document-revision={presentation.revision}
        >
          <rect
            x="0"
            y="0"
            width={presentation.width}
            height={presentation.height}
            rx="12"
            fill="#ffffff"
          />
          {presentation.staffLineYs.map((y) => (
            <line
              key={y}
              data-testid="local-score-staff-line"
              x1="16"
              y1={y}
              x2={presentation.width - 16}
              y2={y}
              stroke="#475569"
              strokeWidth="1.4"
            />
          ))}
          <text
            x="24"
            y={presentation.clefGlyphY}
            fill="#312e81"
            fontFamily="serif"
            fontSize="54"
            aria-hidden="true"
            data-testid={`local-score-${presentation.clef}-clef`}
          >
            {presentation.clefGlyph}
          </text>
          {presentation.keySignatureGlyph !== null
            && presentation.keySignatureGlyphY !== null ? (
              <text
                x="64"
                y={presentation.keySignatureGlyphY + 7}
                fill="#312e81"
                fontFamily="serif"
                fontSize="25"
                aria-hidden="true"
                data-testid="local-score-key-signature"
              >
                {presentation.keySignatureGlyph}
              </text>
            ) : null}
          <g
            fill="#0f172a"
            fontFamily="serif"
            fontSize="18"
            fontWeight="700"
            textAnchor="middle"
            aria-hidden="true"
            data-testid="local-score-meter"
          >
            <text x="82" y={presentation.staffLineYs[0] + 21}>
              {presentation.meterNumerator}
            </text>
            <text x="82" y={presentation.staffLineYs[0] + 42}>
              {presentation.meterDenominator}
            </text>
          </g>

          {presentation.measures.map((measure) => (
            <g
              key={measure.measureNumber}
              data-measure-number={measure.measureNumber}
            >
              <text
                x={measure.startX + 6}
                y="20"
                fill="#64748b"
                fontSize="10"
                aria-hidden="true"
              >
                {measure.measureNumber}
              </text>
              <line
                data-testid={`local-score-barline-${measure.measureNumber}`}
                x1={measure.barlineX}
                y1={presentation.staffLineYs[0]}
                x2={measure.barlineX}
                y2={presentation.staffLineYs[4]}
                stroke="#334155"
                strokeWidth="2"
                aria-hidden="true"
              />
            </g>
          ))}

          {presentation.tokens.map((token) => {
            if (token.type !== "note" || !token.tieToNext) return null;
            const target = token.tieTargetEventId === null
              ? null
              : tokenById.get(token.tieTargetEventId);
            if (!target || target.type !== "note") return null;
            const startX = token.x + 9;
            const endX = target.x - 9;
            const startY = token.y - 9;
            const endY = target.y - 9;
            const archY = Math.min(startY, endY) - 14;
            return (
              <path
                key={`tie-${token.eventId}`}
                d={`M ${startX} ${startY} C ${startX + 18} ${archY}, ${endX - 18} ${archY}, ${endX} ${endY}`}
                fill="none"
                stroke="#7c3aed"
                strokeWidth="2"
                strokeLinecap="round"
                data-testid={`local-score-tie-${token.eventId}-${target.eventId}`}
                aria-hidden="true"
              />
            );
          })}

          {presentation.tokens.map((token) => {
            const selected = token.eventId === selectedEventId;
            const active = activeIds.has(token.eventId);
            const stateLabel = [
              token.accessibleLabel,
              selected ? "已选择" : null,
              active ? "正在播放" : null,
            ].filter(Boolean).join("，");
            return (
              <g
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
              >
                <rect
                  x={token.x - 20}
                  y={presentation.staffLineYs[0] - 10}
                  width="40"
                  height={presentation.staffLineYs[4]
                    - presentation.staffLineYs[0] + 30}
                  rx="9"
                  fill={active ? "#fef3c7" : "transparent"}
                  stroke={selected ? "#4338ca" : "transparent"}
                  strokeWidth={selected ? 2.5 : 0}
                  data-testid={`local-score-event-frame-${token.eventId}`}
                />
                {active ? (
                  <line
                    x1={token.x - 16}
                    y1={presentation.staffLineYs[0] - 8}
                    x2={token.x - 16}
                    y2={presentation.staffLineYs[4] + 18}
                    stroke="#d97706"
                    strokeWidth="3"
                    data-testid={`local-score-playback-cursor-${token.eventId}`}
                    aria-hidden="true"
                  />
                ) : null}
                {token.chordSymbol !== null ? (
                  <text
                    x={token.x}
                    y={presentation.chordSymbolY}
                    fill="#0f766e"
                    fontFamily="sans-serif"
                    fontSize="11"
                    fontWeight="700"
                    textAnchor="middle"
                    data-testid={`local-score-chord-symbol-${token.eventId}`}
                    aria-hidden="true"
                  >
                    {token.chordSymbol}
                  </text>
                ) : null}
                {token.dynamicMark !== null ? (
                  <text
                    x={token.x}
                    y={presentation.dynamicMarkY}
                    textAnchor="middle"
                    fontSize="13"
                    fontStyle="italic"
                    fontWeight="700"
                    fill="currentColor"
                    aria-hidden="true"
                    data-testid={`local-score-dynamic-mark-${token.eventId}`}
                  >
                    {token.dynamicMark}
                  </text>
                ) : null}
                {token.damperPedalMark !== null ? (
                  <text
                    x={token.x}
                    y={presentation.damperPedalY}
                    textAnchor="middle"
                    fontSize="11"
                    fontStyle="italic"
                    fontWeight="700"
                    fill="currentColor"
                    aria-hidden="true"
                    data-testid={`local-score-damper-pedal-mark-${token.eventId}`}
                  >
                    {token.damperPedalMark === "down" ? "Ped." : "✱"}
                  </text>
                ) : null}

                {token.type === "note" ? (
                  <>
                    {token.ledgerLineYs.map((ledgerY) => (
                      <line
                        key={ledgerY}
                        x1={token.x - 14}
                        y1={ledgerY}
                        x2={token.x + 14}
                        y2={ledgerY}
                        stroke="#475569"
                        strokeWidth="1.4"
                        data-testid={`local-score-ledger-${token.eventId}-${ledgerY}`}
                        aria-hidden="true"
                      />
                    ))}
                    {token.accidental === "natural" ? (
                      <text
                        x={token.x - 15}
                        y={token.y + 7}
                        fill="#312e81"
                        fontFamily="serif"
                        fontSize="22"
                        textAnchor="middle"
                        data-testid={`local-score-natural-${token.eventId}`}
                        aria-hidden="true"
                      >
                        ♮
                      </text>
                    ) : null}
                    <ellipse
                      cx={token.x}
                      cy={token.y}
                      rx="8"
                      ry="5.5"
                      transform={`rotate(-18 ${token.x} ${token.y})`}
                      fill={token.head === "open" ? "#ffffff" : "#312e81"}
                      stroke="#312e81"
                      strokeWidth="2"
                      data-testid={`local-score-notehead-${token.eventId}`}
                      aria-hidden="true"
                    />
                    {token.augmentationDots === 1 ? (
                      <circle
                        cx={token.x + 13}
                        cy={token.y}
                        r="2.4"
                        fill="#312e81"
                        data-testid={`local-score-augmentation-dot-${token.eventId}`}
                        aria-hidden="true"
                      />
                    ) : null}
                    <line
                      x1={token.x + 7}
                      y1={token.y}
                      x2={token.x + 7}
                      y2={token.y - 31}
                      stroke="#312e81"
                      strokeWidth="2"
                      data-testid={`local-score-stem-${token.eventId}`}
                      aria-hidden="true"
                    />
                    {token.hasEighthFlag ? (
                      <path
                        d={`M ${token.x + 7} ${token.y - 31} C ${token.x + 23} ${token.y - 27}, ${token.x + 22} ${token.y - 14}, ${token.x + 12} ${token.y - 9}`}
                        fill="none"
                        stroke="#312e81"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        data-testid={`local-score-eighth-flag-${token.eventId}`}
                        aria-hidden="true"
                      />
                    ) : null}
                    {token.fingering !== null ? (
                      <text
                        x={token.x}
                        y={token.y - 42}
                        fill="#4338ca"
                        fontFamily="sans-serif"
                        fontSize="12"
                        fontWeight="700"
                        textAnchor="middle"
                        data-testid={`local-score-fingering-${token.eventId}`}
                        aria-hidden="true"
                      >
                        {token.fingering}
                      </text>
                    ) : null}
                    {token.articulations.length > 0 ? (
                      <g
                        data-testid={`local-score-articulations-${token.eventId}`}
                        aria-hidden="true"
                      >
                        {token.articulations.map((articulation, index) => {
                          const y = token.articulationAnchorY + index * 9;
                          if (articulation === "staccato") {
                            return (
                              <circle
                                key={articulation}
                                cx={token.x}
                                cy={y}
                                r="2.4"
                                fill="#be123c"
                                data-articulation-y={y}
                                data-testid={`local-score-articulation-staccato-${token.eventId}`}
                              />
                            );
                          }
                          if (articulation === "tenuto") {
                            return (
                              <line
                                key={articulation}
                                x1={token.x - 6}
                                y1={y}
                                x2={token.x + 6}
                                y2={y}
                                stroke="#be123c"
                                strokeWidth="2"
                                strokeLinecap="round"
                                data-articulation-y={y}
                                data-testid={`local-score-articulation-tenuto-${token.eventId}`}
                              />
                            );
                          }
                          return (
                            <path
                              key={articulation}
                              d={`M ${token.x - 7} ${y - 4} L ${token.x + 7} ${y} L ${token.x - 7} ${y + 4}`}
                              fill="none"
                              stroke="#be123c"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              data-articulation-y={y}
                              data-testid={`local-score-articulation-accent-${token.eventId}`}
                            />
                          );
                        })}
                      </g>
                    ) : null}
                    {token.lyric !== null ? (
                      <text
                        x={token.x}
                        y={presentation.lyricY}
                        fill="#334155"
                        fontFamily="sans-serif"
                        fontSize="12"
                        textAnchor="middle"
                        data-testid={`local-score-lyric-${token.eventId}`}
                        aria-hidden="true"
                      >
                        {token.lyric}
                      </text>
                    ) : null}
                  </>
                ) : (
                  <>
                    <path
                      d={`M ${token.x - 4} ${token.y - 17} L ${token.x + 5} ${token.y - 8} L ${token.x - 2} ${token.y + 1} L ${token.x + 7} ${token.y + 10} L ${token.x + 1} ${token.y + 20}`}
                      fill="none"
                      stroke="#312e81"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      data-testid={`local-score-quarter-rest-${token.eventId}`}
                      aria-hidden="true"
                    />
                    {token.augmentationDots === 1 ? (
                      <circle
                        cx={token.x + 12}
                        cy={token.y}
                        r="2.4"
                        fill="#312e81"
                        data-testid={`local-score-augmentation-dot-${token.eventId}`}
                        aria-hidden="true"
                      />
                    ) : null}
                  </>
                )}
              </g>
            );
          })}
        </svg>
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
