"use client";

import { useMemo, useState } from "react";

import {
  checkNotationDocumentAnswer,
  createNotationDocumentActivityDefinition,
  type NotationDocumentAnswerMode,
} from "../../lib/activity/notationDocumentActivityAdapter";
import {
  completeActivityCheck,
  createActivitySession,
  restartActivityAttempt,
  submitActivityAnswer,
} from "../../lib/activity/activitySession";
import {
  createScoreDocumentFromNotationTarget,
  getScoreDocumentPresentation,
} from "../../lib/music/scoreDocument";
import type { NotationTemporaryPracticeTarget } from "../../lib/practice/localNotationDraftPracticeTarget";

const modeLabels: Record<NotationDocumentAnswerMode, string> = {
  "staff-notation": "五线谱答案",
  "numbered-notation": "简谱答案",
};

export function NotationDocumentActivityPanel({
  target,
}: {
  target: NotationTemporaryPracticeTarget;
}) {
  const document = useMemo(
    () =>
      target.status === "active"
        ? createScoreDocumentFromNotationTarget(target)
        : null,
    [target],
  );
  const [mode, setMode] =
    useState<NotationDocumentAnswerMode>("staff-notation");
  const definition = useMemo(
    () =>
      document
        ? createNotationDocumentActivityDefinition({ document, mode })
        : null,
    [document, mode],
  );
  const [session, setSession] = useState(() =>
    definition
      ? createActivitySession(
          definition,
          `notation-document-session:${target.id}:staff-notation`,
        )
      : null,
  );

  if (!document || !definition || !session || target.status !== "active") {
    return (
      <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        当前临时目标已失效，不能提交谱面文档答案。请返回修改、重新检查并确认目标。
      </section>
    );
  }

  const presentation = getScoreDocumentPresentation(document, mode);
  const changeMode = (nextMode: NotationDocumentAnswerMode) => {
    const nextDefinition = createNotationDocumentActivityDefinition({
      document,
      mode: nextMode,
    });
    setMode(nextMode);
    setSession(
      createActivitySession(
        nextDefinition,
        `notation-document-session:${target.id}:${nextMode}`,
      ),
    );
  };
  const submit = () => {
    setSession(
      submitActivityAnswer(
        definition,
        session,
        {
          mode,
          documentId: document.documentId,
          revision: document.revision,
        },
        session.revision,
      ),
    );
  };
  const check = () => {
    setSession(
      completeActivityCheck(
        session,
        checkNotationDocumentAnswer({
          document,
          mode,
          answer: session.answer,
        }),
        session.revision,
      ),
    );
  };
  const reset = () =>
    setSession(restartActivityAttempt(session, session.revision));

  return (
    <section className="mt-6 rounded-3xl border border-indigo-200 bg-indigo-50 p-5">
      <p className="text-sm font-semibold text-indigo-700">P114k 乐谱答案活动</p>
      <h3 className="mt-1 text-xl font-bold text-slate-950">
        提交已确认谱面修订
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        先选择表示方式并检查预览，再主动提交。当前只确认文档身份和修订一致性，不评价排版、记谱质量或演奏结果。
      </p>

      <label className="mt-4 block text-sm font-semibold text-slate-800">
        答案表示方式
        <select
          value={mode}
          onChange={(event) =>
            changeMode(event.target.value as NotationDocumentAnswerMode)
          }
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm sm:max-w-xs"
        >
          <option value="staff-notation">五线谱答案</option>
          <option value="numbered-notation">简谱答案</option>
        </select>
      </label>

      <div className="mt-4 rounded-2xl border border-indigo-200 bg-white p-4">
        <p className="text-sm font-bold text-slate-950">
          {modeLabels[mode]}预览 · {document.meter} · 修订 {document.revision}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {presentation.map((measure) => (
            <div
              key={measure.measureNumber}
              className="rounded-xl border border-slate-200 p-3"
            >
              <p className="text-xs font-semibold text-slate-500">
                第 {measure.measureNumber} 小节
              </p>
              <p className="mt-2 font-mono text-lg text-slate-900">
                | {measure.tokens.join("  ")} |
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {session.lifecycle === "ready" ? (
          <button
            type="button"
            onClick={submit}
            className="rounded-full bg-indigo-700 px-4 py-2 text-sm font-semibold text-white"
          >
            提交当前已确认谱面
          </button>
        ) : null}
        {session.lifecycle === "answering" ? (
          <button
            type="button"
            onClick={check}
            className="rounded-full bg-indigo-700 px-4 py-2 text-sm font-semibold text-white"
          >
            检查文档与修订
          </button>
        ) : null}
        {session.lifecycle === "checked" ? (
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-indigo-300 bg-white px-4 py-2 text-sm font-semibold text-indigo-800"
          >
            重置本轮答案
          </button>
        ) : null}
      </div>

      {session.checkEvidence ? (
        <p
          className={`mt-4 rounded-2xl border p-4 text-sm ${
            session.checkEvidence.state === "consistent"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {session.checkEvidence.explanation}
        </p>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-slate-600">
        会话边界：谱面文档刷新后消失，不上传、不持久化、不产生分数，也不是完整制谱编辑器或正式识谱结果。
      </p>
    </section>
  );
}
