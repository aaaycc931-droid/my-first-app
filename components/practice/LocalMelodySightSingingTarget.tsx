"use client";

import {
  getLocalMelodySightSingingPresentation,
  type LocalMelodySightSingingTarget,
} from "../../lib/practice/localMelodySightSinging";

const STAFF_LINE_Y = [36, 48, 60, 72, 84] as const;
const NOTE_X = [104, 184, 264] as const;
const BOTTOM_LINE_Y = STAFF_LINE_Y.at(-1)!;
const STAFF_STEP_HEIGHT = 6;

type Props = {
  target: LocalMelodySightSingingTarget;
};

export function LocalMelodySightSingingTarget({ target }: Props) {
  const presentation = getLocalMelodySightSingingPresentation(target);
  const accessibleTarget = presentation.map((item) => item.accessibleLabel).join("；");

  return (
    <section
      className="rounded-2xl border border-teal-200 bg-white p-4"
      aria-label="当前三音旋律视唱目标"
      data-testid="melody-sight-singing-target"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-slate-950">可见三音视唱目标</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            五线谱与固定唱名来自同一个版本化目标；请按四拍预备后的顺序视唱。
          </p>
        </div>
        <p className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900">
          高音谱号 · 4/4 · {target.bpm} BPM
        </p>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-teal-100 bg-teal-50/40 p-2">
        <svg
          viewBox="0 0 320 116"
          role="img"
          aria-label={`当前三音五线谱目标：${accessibleTarget}。`}
          className="mx-auto block h-auto min-w-[280px] max-w-xl"
        >
          <rect x="0" y="0" width="320" height="116" rx="12" fill="#ffffff" />
          {STAFF_LINE_Y.map((y) => (
            <line
              key={y}
              data-testid="melody-sight-singing-staff-line"
              x1="52"
              y1={y}
              x2="304"
              y2={y}
              stroke="#475569"
              strokeWidth="1.4"
            />
          ))}
          <text
            data-testid="melody-sight-singing-treble-clef"
            x="58"
            y="87"
            fill="#0f766e"
            fontSize="54"
            fontFamily="serif"
            aria-hidden="true"
          >
            𝄞
          </text>
          {presentation.map((item) => {
            const x = NOTE_X[item.position];
            const y = BOTTOM_LINE_Y - item.staffStepFromBottomLine * STAFF_STEP_HEIGHT;
            return (
              <g key={item.position} aria-hidden="true">
                {item.ledgerLine === "c4-below-staff" ? (
                  <line
                    data-testid={`melody-sight-singing-c4-ledger-${item.position}`}
                    x1={x - 14}
                    y1={y}
                    x2={x + 14}
                    y2={y}
                    stroke="#475569"
                    strokeWidth="1.4"
                  />
                ) : null}
                {item.accidental === "sharp" ? (
                  <text
                    data-testid={`melody-sight-singing-sharp-${item.position}`}
                    x={x - 22}
                    y={y + 6}
                    fill="#0f172a"
                    fontSize="20"
                    fontFamily="serif"
                  >
                    ♯
                  </text>
                ) : null}
                <ellipse
                  data-testid={`melody-sight-singing-notehead-${item.position}`}
                  cx={x}
                  cy={y}
                  rx="8"
                  ry="5.5"
                  transform={`rotate(-18 ${x} ${y})`}
                  fill="#0f766e"
                  stroke="#0f766e"
                  strokeWidth="2"
                />
                <line
                  x1={x + 7}
                  y1={y}
                  x2={x + 7}
                  y2={y - 31}
                  stroke="#0f766e"
                  strokeWidth="2"
                />
                <text x={x} y="110" textAnchor="middle" fill="#64748b" fontSize="10">
                  {item.position + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <ol className="mt-4 grid gap-3 sm:grid-cols-3" aria-label="当前三音固定唱名目标">
        {presentation.map((item) => (
          <li
            key={item.position}
            className="rounded-xl border border-teal-100 bg-teal-50/60 p-3 text-center"
            data-testid={`melody-sight-singing-solfege-${item.position}`}
            aria-label={item.accessibleLabel}
          >
            <p className="text-xs font-semibold text-slate-500">第 {item.position + 1} 个音</p>
            <p className="mt-1 text-xl font-black text-teal-950">{item.fixedSolfegeLabel}</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">{item.noteLabel}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
