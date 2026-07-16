"use client";

import { useRef, useState } from "react";

import { getSupabaseBrowserClient } from "../../lib/platform/supabaseBrowser";

export type CourseAttemptSaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "auth-required"
  | "error";

export function useCourseAttemptPersistence() {
  const [saveStatus, setSaveStatus] = useState<CourseAttemptSaveStatus>("idle");
  const requestGenerationRef = useRef(0);
  const isRequestPendingRef = useRef(false);

  const resetSaveStatus = () => {
    requestGenerationRef.current += 1;
    isRequestPendingRef.current = false;
    setSaveStatus("idle");
  };

  const saveCourseAttempt = async (
    rpcName: string,
    rpcArgs: Record<string, unknown>,
  ) => {
    if (
      isRequestPendingRef.current ||
      saveStatus === "saving" ||
      saveStatus === "saved"
    ) {
      return;
    }

    const requestGeneration = requestGenerationRef.current + 1;
    requestGenerationRef.current = requestGeneration;
    isRequestPendingRef.current = true;
    setSaveStatus("saving");

    const finish = (status: CourseAttemptSaveStatus) => {
      if (requestGenerationRef.current !== requestGeneration) return;
      isRequestPendingRef.current = false;
      setSaveStatus(status);
    };

    const client = getSupabaseBrowserClient();
    if (!client) {
      finish("error");
      return;
    }

    const { data, error: sessionError } = await client.auth.getSession();
    if (sessionError) {
      finish("error");
      return;
    }
    if (!data.session) {
      finish("auth-required");
      return;
    }

    const { error } = await client.rpc(rpcName, rpcArgs);
    finish(error ? "error" : "saved");
  };

  return { resetSaveStatus, saveCourseAttempt, saveStatus };
}

export function CourseAttemptSaveNotice({
  status,
}: {
  status: CourseAttemptSaveStatus;
}) {
  if (status === "saved") {
    return (
      <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
        练习记录已保存到你的私人账户。它只记录题目与选择摘要，不是正式评分。
      </p>
    );
  }

  if (status === "auth-required") {
    return (
      <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">
        答案已显示，但当前未登录，因此没有保存练习记录。
        <a href="/account" className="ml-1 font-semibold underline">
          前往账户登录
        </a>
      </p>
    );
  }

  if (status === "error") {
    return (
      <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-800">
        答案已显示，但练习记录保存失败。请保持当前选择，再次点击“查看本题答案”重试保存。
      </p>
    );
  }

  return null;
}
