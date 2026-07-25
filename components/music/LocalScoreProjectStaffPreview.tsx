"use client";

import { useMemo, type KeyboardEvent } from "react";

import {
  createLocalScoreProjectStaffPresentation,
  LOCAL_SCORE_STAFF_LINE_Y,
  type LocalScoreStaffEventLocation,
  type LocalScoreStaffToken,
} from "../../lib/music/localScoreProjectStaffPresentation";
import type { LocalNotationProjectScoreDocumentV1 } from "../../lib/music/scoreDocument";

export type LocalScoreProjectStaffSelection = Readonly<{
  eventId: string;
  location: LocalScoreStaffEventLocation;
}>;

export type LocalScoreProjectStaffPreviewProps = Readonly<{
  document: LocalNotationProjectScoreDocumentV1;
  selectedEventId?: string | null;
  activeEventIds?: readonly string[];
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
  onSelectEvent,
}: LocalScoreProjectStaffPreviewProps) {
  const presentation = useMemo(
    () => createLocalScoreProjectStaffPresentation(document),
    [document],
  );
  const activeIds = useMemo(() => new Set(activeEventIds), [activeEventIds]);

  if (presentation.status === "blocked") {
    return (
      <section
        className="rounded-2xl border border-rose-200 bg-rose-50 p-4"
        aria-label="第一声部五线谱预览"
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
  const previewLabel =
    `第一声部五线谱预览，拍号 ${presentation.meter}，`
    + `共 ${presentation.measures.length} 小节。${eventSummary}。`;

  return (
    <section
      className="rounded-2xl border border-indigo-200 bg-white p-4"
      aria-label="第一声部图形五线谱"
      data-testid="local-score-project-staff-preview"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-slate-950">第一声部图形预览</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            图形来自当前已保存修订；蓝框表示选择，琥珀色表示当前播放事件。
          </p>
        </div>
        <p className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-900">
          高音谱号 · {presentation.meter}
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
          {LOCAL_SCORE_STAFF_LINE_Y.map((y) => (
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
            y="87"
            fill="#312e81"
            fontFamily="serif"
            fontSize="54"
            aria-hidden="true"
            data-testid="local-score-treble-clef"
          >
            𝄞
          </text>
          <g
            fill="#0f172a"
            fontFamily="serif"
            fontSize="18"
            fontWeight="700"
            textAnchor="middle"
            aria-hidden="true"
            data-testid="local-score-meter"
          >
            <text x="78" y="57">{presentation.meterNumerator}</text>
            <text x="78" y="78">{presentation.meterDenominator}</text>
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
                y1={LOCAL_SCORE_STAFF_LINE_Y[0]}
                x2={measure.barlineX}
                y2={LOCAL_SCORE_STAFF_LINE_Y.at(-1)}
                stroke="#334155"
                strokeWidth="2"
                aria-hidden="true"
              />
            </g>
          ))}

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
                  y="26"
                  width="40"
                  height="78"
                  rx="9"
                  fill={active ? "#fef3c7" : "transparent"}
                  stroke={selected ? "#4338ca" : "transparent"}
                  strokeWidth={selected ? 2.5 : 0}
                  data-testid={`local-score-event-frame-${token.eventId}`}
                />
                {active ? (
                  <line
                    x1={token.x - 16}
                    y1="28"
                    x2={token.x - 16}
                    y2="102"
                    stroke="#d97706"
                    strokeWidth="3"
                    data-testid={`local-score-playback-cursor-${token.eventId}`}
                    aria-hidden="true"
                  />
                ) : null}

                {token.type === "note" ? (
                  <>
                    {token.hasC4LedgerLine ? (
                      <line
                        x1={token.x - 14}
                        y1={token.y}
                        x2={token.x + 14}
                        y2={token.y}
                        stroke="#475569"
                        strokeWidth="1.4"
                        data-testid={`local-score-c4-ledger-${token.eventId}`}
                        aria-hidden="true"
                      />
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
                  </>
                ) : (
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
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {presentation.tokens.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">
          当前第一声部没有音符或休止符。
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
