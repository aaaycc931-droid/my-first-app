import { ChangeEvent, RefObject, useEffect, useRef, useState } from "react";

import {
  formatLocalSheetMusicFileSize,
  localSheetMusicAcceptedFileInput,
  validateLocalSheetMusicImageFile,
} from "../../lib/practice/localSheetMusicImportSource";

type SheetMusicPreviewState =
  | { status: "empty"; message?: string }
  | { status: "loading"; fileName: string; objectUrl: string }
  | {
      status: "ready";
      objectUrl: string;
      metadata: {
        fileName: string;
        mimeType: string;
        fileSizeLabel: string;
        width: number;
        height: number;
      };
    }
  | { status: "unsupported" | "decode-failed"; message: string };

type SheetMusicImportPreviewPanelProps = {
  inputRef: RefObject<HTMLInputElement>;
  onSourceChange?: (sourceId: string | null) => void;
};

const disabledReason =
  "当前 Stage A 只支持本地预览，不识谱、不生成练习目标，因此不能进入练习。";

export function SheetMusicImportPreviewPanel({
  inputRef,
  onSourceChange,
}: SheetMusicImportPreviewPanelProps) {
  const [previewState, setPreviewState] = useState<SheetMusicPreviewState>({
    status: "empty",
  });
  const objectUrlRef = useRef<string | null>(null);

  const revokeCurrentObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  useEffect(() => () => revokeCurrentObjectUrl(), []);

  const resetFileInput = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleClear = (message = "已清除当前本地文件。") => {
    revokeCurrentObjectUrl();
    resetFileInput();
    onSourceChange?.(null);
    setPreviewState({ status: "empty", message });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    revokeCurrentObjectUrl();

    if (!file) {
      onSourceChange?.(null);
      setPreviewState({ status: "empty" });
      return;
    }

    const validation = validateLocalSheetMusicImageFile(file);
    if (!validation.ok) {
      resetFileInput();
      onSourceChange?.(null);
      setPreviewState({ status: "unsupported", message: validation.message });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    const sourceId = `${file.name}:${file.size}:${file.lastModified}`;
    setPreviewState({ status: "loading", fileName: file.name, objectUrl });

    const image = new Image();
    image.onload = () => {
      onSourceChange?.(sourceId);
      setPreviewState({
        status: "ready",
        objectUrl,
        metadata: {
          fileName: file.name,
          mimeType: file.type || "未知类型",
          fileSizeLabel: formatLocalSheetMusicFileSize(file.size),
          width: image.naturalWidth,
          height: image.naturalHeight,
        },
      });
    };
    image.onerror = () => {
      revokeCurrentObjectUrl();
      resetFileInput();
      onSourceChange?.(null);
      setPreviewState({
        status: "decode-failed",
        message:
          "图片预览失败。请确认文件没有损坏，或更换一张清晰的乐谱图片。",
      });
    };
    image.src = objectUrl;
  };

  const openFilePicker = () => inputRef.current?.click();

  const renderStatusBody = () => {
    if (previewState.status === "ready") {
      return (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <img
              src={previewState.objectUrl}
              alt="本地乐谱图片预览"
              className="max-h-[480px] w-full object-contain"
            />
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-slate-800">
            <p className="font-bold text-emerald-900">已生成本地预览</p>
            <dl className="mt-3 space-y-2">
              <div><dt className="font-semibold">文件名</dt><dd className="break-all">{previewState.metadata.fileName}</dd></div>
              <div><dt className="font-semibold">文件类型</dt><dd>{previewState.metadata.mimeType}</dd></div>
              <div><dt className="font-semibold">文件大小</dt><dd>{previewState.metadata.fileSizeLabel}</dd></div>
              <div><dt className="font-semibold">图片宽度</dt><dd>{previewState.metadata.width} px</dd></div>
              <div><dt className="font-semibold">图片高度</dt><dd>{previewState.metadata.height} px</dd></div>
              <div><dt className="font-semibold">本地导入状态</dt><dd>已在当前浏览器会话中载入</dd></div>
              <div><dt className="font-semibold">是否 local-only</dt><dd>是</dd></div>
              <div><dt className="font-semibold">是否可识谱</dt><dd>否</dd></div>
              <div><dt className="font-semibold">是否可进入练习</dt><dd>否</dd></div>
            </dl>
          </div>
        </div>
      );
    }

    if (previewState.status === "loading") {
      return (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          正在本地解码图片预览：{previewState.fileName}。预览完成前不会生成练习目标。
        </div>
      );
    }

    if (previewState.status === "unsupported" || previewState.status === "decode-failed") {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          {previewState.message}
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
        <p className="font-semibold text-slate-900">当前没有导入乐谱图片。</p>
        <p className="mt-2">请选择本地 PNG、JPG 或 JPEG 乐谱图片进行预览。</p>
        <p>文件只会在浏览器本地预览；当前阶段不会上传、不会保存、不会识谱、不会生成练习目标。</p>
        {previewState.message ? <p className="mt-2 text-emerald-700">{previewState.message}</p> : null}
      </div>
    );
  };

  return (
    <section className="mt-6 rounded-3xl border border-indigo-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Stage A Runtime Alpha</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">本地乐谱图片导入与预览</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
            先选择一张本地乐谱图片进行预览。当前阶段只支持浏览器本地查看，不识谱、不生成练习目标，也不能进入练习。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={openFilePicker} className="rounded-full bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800">
            {previewState.status === "ready" ? "替换本地乐谱图片" : "选择本地乐谱图片"}
          </button>
          <button type="button" onClick={() => handleClear()} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            清除当前文件
          </button>
        </div>
      </div>

      <input ref={inputRef} type="file" accept={localSheetMusicAcceptedFileInput} onChange={handleFileChange} className="sr-only" />

      <div className="mt-5">{renderStatusBody()}</div>

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
          <p className="font-bold text-slate-950">本地与隐私说明</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>文件只在当前浏览器会话中使用。</li>
            <li>当前不会上传、不会保存，刷新页面后不会保留。</li>
            <li>当前不会调用识谱接口，也不会调用 /api/recognize。</li>
            <li>不会写入 localStorage 或 IndexedDB 保存图片内容。</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
          <p className="font-bold text-slate-950">当前阶段限制</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>当前阶段只显示本地预览，不识别音符、节奏、小节线、拍号或调号。</li>
            <li>当前阶段不会生成视唱或节奏练习目标，因此不能进入练习。</li>
            <li>重新选择文件会替换当前预览，并使旧文件状态失效。</li>
            <li>{disabledReason}</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
