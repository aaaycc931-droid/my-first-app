import type { ChangeEvent, Ref } from "react";

import {
  localMelodyGuideBestSourceCopy,
  localMelodyGuideBrowserDecodeSupportCopy,
  localMelodyGuideLocalOnlyCopy,
  type LocalMelodyGuideAudioSource,
} from "../../lib/practice/localMelodyGuideAudio";

type LocalMelodyGuideAudioImportPanelProps = {
  source: LocalMelodyGuideAudioSource | null;
  decodeError: string;
  inputRef: Ref<HTMLInputElement>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
};

export function LocalMelodyGuideAudioImportPanel({
  source,
  decodeError,
  inputRef,
  onFileChange,
  onClear,
}: LocalMelodyGuideAudioImportPanelProps) {
  return (
    <section className="mt-6 rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
            P36 浏览器本地基础
          </p>
          <h2 className="mt-1 text-2xl font-bold text-cyan-950">
            本地旋律参考音频导入
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-900">
            选择一个本地音频文件，作为后续目标音高曲线草稿的旋律参考来源。{localMelodyGuideBrowserDecodeSupportCopy}
          </p>
          <p className="mt-3 text-sm font-semibold text-cyan-900">
            {localMelodyGuideBestSourceCopy}
          </p>
        </div>
        <div className="rounded-2xl border border-cyan-200 bg-white p-4 text-sm text-cyan-950 shadow-sm lg:min-w-64">
          <p className="font-semibold">浏览器解码状态</p>
          <p className="mt-2 text-3xl font-bold">{source?.status ?? "空闲"}</p>
          <p className="mt-1 font-medium">
            {source ? "仅当前会话的旋律参考来源" : "尚未选择本地参考音频"}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-cyan-200 bg-white p-4">
        <label className="block text-sm font-bold text-cyan-950">
          选择本地旋律参考音频
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,.wav,.mp3,.m4a"
            onChange={onFileChange}
            className="mt-3 block w-full rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-slate-900"
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onClear}
            disabled={!source}
            className="rounded-full border border-cyan-300 bg-white px-4 py-2 text-sm font-semibold text-cyan-800 disabled:text-slate-400"
          >
            清除 / 重置本地参考
          </button>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
            仅作为旋律参考来源 · 不用于正式评分
          </span>
        </div>
      </div>

      {source ? (
        <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-cyan-200">
            <p className="font-semibold text-cyan-950">已选文件</p>
            <p className="mt-2 break-words text-cyan-800">{source.fileName}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-cyan-200">
            <p className="font-semibold text-cyan-950">文件元数据</p>
            <p className="mt-2 text-cyan-800">
              {source.fileType} · {source.fileSizeLabel}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-cyan-200">
            <p className="font-semibold text-cyan-950">已解码元数据</p>
            <p className="mt-2 text-cyan-800">
              时长 {source.decodedDurationSeconds === null ? "—" : `${source.decodedDurationSeconds.toFixed(2)}s`} · 采样率 {source.sampleRate ?? "—"} Hz · 声道数 {source.channelCount ?? "—"}
            </p>
          </div>
        </div>
      ) : null}

      {decodeError ? (
        <p className="mt-3 text-sm font-semibold text-red-700">{decodeError}</p>
      ) : null}

      <div className="mt-5 grid gap-3 text-sm lg:grid-cols-2">
        <div className="rounded-2xl border border-cyan-200 bg-white p-4">
          <p className="font-bold text-cyan-950">MVP 边界</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-cyan-900">
            {localMelodyGuideLocalOnlyCopy.map((item) => (
              <li key={item}>{item}</li>
            ))}
            <li>P36 不做私有云歌曲分析。</li>
            <li>P37 之前不生成目标音高曲线。</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-900">来源建议</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
            <li>{localMelodyGuideBestSourceCopy}</li>
            <li>完整混音歌曲应等待未来私有云歌曲分析。</li>
            <li>本 MVP 中音频保留在浏览器内。</li>
          </ul>
        </div>
      </div>

      {source?.warnings.length ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-4 text-sm">
          <p className="font-bold text-amber-900">警告</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
            {source.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
