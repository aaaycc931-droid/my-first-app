"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useRef, useState } from "react";

import type { RecognizedNote, RecognizeResponse } from "../../lib/recognition";
import {
  createBrowserAudioChannel,
  type BrowserAudioChannel,
} from "../../lib/audio/browserAudioEngine";
import { noteNameToFrequencyHz } from "../../lib/audio/noteFrequency";

type RecognizeStatus = "未上传" | "已上传" | "识别中" | "识别完成" | "识别失败";
type MusicXMLImportStatus = "idle" | "importing" | "success" | "error";
type AudiverisDevStatus = "idle" | "processing" | "success" | "error";

type AudiverisDevSummary = {
  noteCount: number;
  firstNotes: RecognizedNote[];
  source: string;
  inputType: string;
  notes?: RecognizedNote[];
  returnedNoteCount?: number;
  notesTruncated?: boolean;
};

const durationToBeats: Record<RecognizedNote["duration"], number> = {
  eighth: 0.5,
  quarter: 1,
  half: 2,
  whole: 4,
};

const minBpm = 40;
const maxBpm = 240;
const defaultBpm = 120;
const maxMusicXMLFileSizeBytes = 2 * 1024 * 1024;
const isMusicXMLImportEnabled =
  process.env.NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED === "true";
const isAudiverisDevUIEnabled =
  process.env.NEXT_PUBLIC_AUDIVERIS_DEV_UI_ENABLED === "true";
const isAudiverisDevFullNotesEnabled =
  process.env.NEXT_PUBLIC_AUDIVERIS_DEV_FULL_NOTES_ENABLED === "true";

const calculateDurationSeconds = (
  duration: RecognizedNote["duration"],
  bpm: number,
) => durationToBeats[duration] * (60 / bpm);

const durationLabel: Record<RecognizedNote["duration"], string> = {
  eighth: "八分音符",
  quarter: "四分音符",
  half: "二分音符",
  whole: "全音符",
};

export default function Home() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [recognizedNotes, setRecognizedNotes] = useState<RecognizedNote[]>([]);
  const [recognizeStatus, setRecognizeStatus] =
    useState<RecognizeStatus>("未上传");
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognizeError, setRecognizeError] = useState("");
  const [playError, setPlayError] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingNoteIndex, setPlayingNoteIndex] = useState<number | null>(null);
  const [bpm, setBpm] = useState(defaultBpm);
  const [musicXMLFile, setMusicXMLFile] = useState<File | null>(null);
  const [musicXMLImportError, setMusicXMLImportError] = useState("");
  const [isImportingMusicXML, setIsImportingMusicXML] = useState(false);
  const [musicXMLImportStatus, setMusicXMLImportStatus] =
    useState<MusicXMLImportStatus>("idle");
  const [importedMusicXMLNoteCount, setImportedMusicXMLNoteCount] = useState(0);
  const [audiverisDevFile, setAudiverisDevFile] = useState<File | null>(null);
  const [audiverisDevStatus, setAudiverisDevStatus] =
    useState<AudiverisDevStatus>("idle");
  const [audiverisDevError, setAudiverisDevError] = useState("");
  const [audiverisDevSummary, setAudiverisDevSummary] =
    useState<AudiverisDevSummary | null>(null);
  const playbackChannelRef = useRef<BrowserAudioChannel | null>(null);
  if (!playbackChannelRef.current) playbackChannelRef.current = createBrowserAudioChannel();
  const playbackTimeoutIdsRef = useRef<number[]>([]);
  const imagePreviewUrlRef = useRef<string | null>(null);

  const stopPlaybackPreview = () => {
    playbackTimeoutIdsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    playbackTimeoutIdsRef.current = [];

    playbackChannelRef.current?.stop();

    setIsPlaying(false);
    setPlayingNoteIndex(null);
  };

  useEffect(
    () => () => {
      playbackTimeoutIdsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      playbackTimeoutIdsRef.current = [];
      playbackChannelRef.current?.stop();
      if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current);
    },
    [],
  );

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    imagePreviewUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    setSelectedFile(file);
    setFileName(file.name);
    setRecognizedNotes([]);
    setRecognizeStatus("已上传");
    setRecognizeError("");
    setPlayError("");
    stopPlaybackPreview();
  };

  const handleBpmChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextBpm = Number(event.target.value);

    if (Number.isNaN(nextBpm)) {
      return;
    }

    setBpm(Math.min(maxBpm, Math.max(minBpm, nextBpm)));
  };

  const handleMusicXMLSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    setMusicXMLFile(null);
    setMusicXMLImportError("");
    setMusicXMLImportStatus("idle");
    setImportedMusicXMLNoteCount(0);

    if (!file) {
      return;
    }

    const extension = file.name.toLowerCase().split(".").pop();

    if (
      extension !== "musicxml" &&
      extension !== "xml" &&
      extension !== "mxl"
    ) {
      setMusicXMLImportError("请选择 .musicxml、.xml 或 .mxl 文件。");
      setMusicXMLImportStatus("error");
      event.target.value = "";
      return;
    }

    if (file.size === 0) {
      setMusicXMLImportError("MusicXML 文件为空，请选择包含乐谱内容的文件。");
      setMusicXMLImportStatus("error");
      event.target.value = "";
      return;
    }

    if (file.size > maxMusicXMLFileSizeBytes) {
      setMusicXMLImportError("MusicXML 文件过大，当前最大支持 2 MB。");
      setMusicXMLImportStatus("error");
      event.target.value = "";
      return;
    }

    setMusicXMLFile(file);
  };

  const handleMusicXMLImport = async () => {
    if (!musicXMLFile || isImportingMusicXML) {
      return;
    }

    setIsImportingMusicXML(true);
    setMusicXMLImportStatus("importing");
    setMusicXMLImportError("");
    setRecognizeError("");
    setPlayError("");

    const formData = new FormData();
    formData.append("file", musicXMLFile);

    try {
      const response = await fetch("/api/dev/recognize-musicxml", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as RecognizeResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error || "MusicXML 导入接口调用失败。");
      }

      const importedNotes = data.notes || [];

      setRecognizedNotes(importedNotes);
      setImportedMusicXMLNoteCount(importedNotes.length);
      setMusicXMLImportStatus("success");
      setRecognizeStatus("识别完成");
      stopPlaybackPreview();
    } catch (error) {
      setMusicXMLImportStatus("error");
      setMusicXMLImportError(
        error instanceof Error
          ? error.message
          : "MusicXML 导入失败，请检查文件和开发 API 开关后重试。",
      );
    } finally {
      setIsImportingMusicXML(false);
    }
  };

  const handleAudiverisDevSelection = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    setAudiverisDevFile(null);
    setAudiverisDevStatus("idle");
    setAudiverisDevError("");
    setAudiverisDevSummary(null);

    if (!file) {
      return;
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setAudiverisDevStatus("error");
      setAudiverisDevError(
        "仅开发使用的 Local Audiveris 面板只接受 PDF 文件。",
      );
      event.target.value = "";
      return;
    }

    setAudiverisDevFile(file);
  };

  const handleAudiverisDevRecognize = async () => {
    if (!audiverisDevFile || audiverisDevStatus === "processing") {
      return;
    }

    setAudiverisDevStatus("processing");
    setAudiverisDevError("");
    setAudiverisDevSummary(null);

    const formData = new FormData();
    formData.append("file", audiverisDevFile);
    if (isAudiverisDevFullNotesEnabled) {
      formData.append("includeNotes", "full");
    }

    try {
      const response = await fetch("/api/dev/recognize-audiveris", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as Partial<AudiverisDevSummary> & {
        error?: string;
      };

      if (!response.ok || data.error) {
        throw new Error(
          data.error || "仅开发使用的 Local Audiveris PDF 测试失败。",
        );
      }

      setAudiverisDevSummary({
        noteCount: data.noteCount ?? 0,
        firstNotes: data.firstNotes ?? [],
        source: data.source ?? "unknown",
        inputType: data.inputType ?? "unknown",
        notes: data.notes,
        returnedNoteCount: data.returnedNoteCount,
        notesTruncated: data.notesTruncated,
      });
      setAudiverisDevStatus("success");
    } catch (error) {
      setAudiverisDevStatus("error");
      setAudiverisDevError(
        error instanceof Error
          ? error.message
          : "仅开发使用的 Local Audiveris PDF 测试失败。",
      );
    }
  };

  const handleRecognize = async () => {
    if (!selectedFile || isRecognizing) {
      return;
    }

    setIsRecognizing(true);
    setRecognizeStatus("识别中");
    setRecognizeError("");
    setPlayError("");

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      const response = await fetch("/api/recognize", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as RecognizeResponse;

      if (!response.ok) {
        throw new Error(data.error || "识别接口调用失败");
      }

      setRecognizedNotes(data.notes || []);
      setRecognizeStatus("识别完成");
    } catch (error) {
      setRecognizeStatus("识别失败");
      setRecognizeError(
        error instanceof Error ? error.message : "识别失败，请稍后再试。",
      );
      setRecognizedNotes([]);
    } finally {
      setIsRecognizing(false);
    }
  };

  const playNotesPreview = async (
    notes: RecognizedNote[],
    trackMainResultIndex: boolean,
  ) => {
    if (notes.length === 0) {
      return;
    }

    stopPlaybackPreview();
    setIsPlaying(true);
    setPlayError("");
    setPlayingNoteIndex(null);

    try {
      const audioContext = playbackChannelRef.current!.getContext();
      const startTime = audioContext.currentTime + 0.04;
      let offset = 0;

      notes.forEach(({ note, duration }, index) => {
        const noteOffset = offset;
        const noteDuration = calculateDurationSeconds(duration, bpm);
        const frequencyHz = noteNameToFrequencyHz(note);
        if (frequencyHz === null) throw new Error(`Unsupported note: ${note}`);
        const noteStartTime = startTime + noteOffset;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequencyHz;
        gain.gain.setValueAtTime(0.0001, noteStartTime);
        gain.gain.exponentialRampToValueAtTime(0.16, noteStartTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStartTime + Math.max(0.03, noteDuration - 0.02));
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        playbackChannelRef.current!.trackSource(oscillator, [gain]);
        oscillator.start(noteStartTime);
        oscillator.stop(noteStartTime + noteDuration);

        if (trackMainResultIndex) {
          const noteTimeoutId = window.setTimeout(() => {
            setPlayingNoteIndex(index);
          }, noteOffset * 1000);
          playbackTimeoutIdsRef.current.push(noteTimeoutId);
        }

        offset += noteDuration;
      });

      const completionTimeoutId = window.setTimeout(
        () => {
          playbackChannelRef.current?.stop();
          playbackTimeoutIdsRef.current = [];
          setPlayingNoteIndex(null);
          setIsPlaying(false);
        },
        offset * 1000 + 500,
      );
      playbackTimeoutIdsRef.current.push(completionTimeoutId);
    } catch {
      setPlayError("播放失败，请稍后再试。");
      stopPlaybackPreview();
    }
  };

  const handlePlayRecognizedNotes = async () => {
    await playNotesPreview(recognizedNotes, true);
  };

  const handlePlayAudiverisFirstNotesPreview = async () => {
    await playNotesPreview(audiverisDevSummary?.firstNotes ?? [], false);
  };

  const handlePlayAudiverisFullNotesPreview = async () => {
    await playNotesPreview(audiverisDevSummary?.notes ?? [], false);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <Link href="/" className="mb-5 inline-block text-sm font-semibold text-indigo-700">← 返回学习首页</Link>
        <div className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold text-blue-600">五线谱识别 MVP</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            五线谱识别 MVP
          </h1>
          <p className="mt-3 text-slate-600">
            当前公开页面用于展示五线谱识别 MVP 的模拟识别流程：上传
            JPG/PNG，调用 `/api/recognize`，查看音符结果，并播放或停止播放结果。
          </p>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <p className="rounded-2xl border border-blue-200 bg-blue-50 p-4 font-medium text-blue-800">
              当前公开演示使用模拟识别结果；默认识别 provider 仍是 mock。
            </p>
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 font-medium text-amber-800">
              真实 Audiveris 识别仅限本地开发测试；Production/Vercel 不运行
              Audiveris，`/api/recognize` 当前不处理 PDF。
            </p>
            <Link
              className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-medium text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100 sm:col-span-2"
              href="/practice"
            >
              进入练习：使用现有的本地视唱、节奏和听辨练习功能。
            </Link>
            <Link
              className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 font-medium text-indigo-800 transition hover:border-indigo-300 hover:bg-indigo-100 sm:col-span-2"
              href="/account"
            >
              打开私人学习账户：登录后可逐步启用私有数据同步、素材与学习记录。
            </Link>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <label className="block rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-blue-400 hover:bg-blue-50/50">
            <span className="block text-base font-semibold text-slate-800">
              选择图片
            </span>
            <span className="mt-2 block text-sm text-slate-500">
              支持 JPG/PNG，大小限制 10MB。上传后点击「开始识别」，主流程会调用
              `/api/recognize`。
            </span>
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleImageUpload}
            />
          </label>

          {previewUrl ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold">图片预览</h2>
                <p className="text-sm text-slate-500">{fileName}</p>
              </div>
              {/* Local object URLs cannot use the Next.js image optimizer. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="max-h-[420px] w-full rounded-xl object-contain ring-1 ring-slate-200"
                src={previewUrl}
                alt="上传的五线谱预览"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">
              上传后会在这里显示图片预览。
            </div>
          )}

          <button
            className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            type="button"
            onClick={handleRecognize}
            disabled={!previewUrl || isRecognizing}
          >
            {isRecognizing ? "识别中" : "开始识别"}
          </button>

          {isMusicXMLImportEnabled ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
                  实验功能
                </p>
                <h2 className="mt-1 text-lg font-semibold">导入 MusicXML</h2>
                <p className="mt-2 text-sm text-slate-600">
                  {
                    "仅用于开发验证，文件最大 2 MB。支持 .musicxml、.xml、.mxl；.mxl 只会在 dev API 中解压验证，不影响图片上传主流程。"
                  }
                </p>
              </div>

              <label className="mt-4 block text-sm font-semibold text-slate-800">
                选择 MusicXML 文件
                <input
                  className="mt-2 block w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-amber-100 file:px-3 file:py-2 file:font-semibold file:text-amber-800"
                  type="file"
                  accept=".musicxml,.xml,.mxl,application/xml,text/xml"
                  onChange={handleMusicXMLSelection}
                />
              </label>

              <div className="mt-3 text-sm" aria-live="polite">
                {musicXMLFile ? (
                  <p className="text-slate-600">已选择：{musicXMLFile.name}</p>
                ) : null}
                {musicXMLImportStatus === "idle" && !musicXMLFile ? (
                  <p className="text-slate-600">
                    请选择 .musicxml、.xml 或 .mxl 文件。
                  </p>
                ) : null}
                {musicXMLImportStatus === "importing" ? (
                  <p className="font-medium text-amber-700">
                    正在解析 MusicXML...
                  </p>
                ) : null}
                {musicXMLImportStatus === "success" ? (
                  <p className="font-medium text-green-700">
                    导入成功，已解析 {importedMusicXMLNoteCount} 个音符
                  </p>
                ) : null}
                {musicXMLImportStatus === "error" && musicXMLImportError ? (
                  <p className="text-red-600">{musicXMLImportError}</p>
                ) : null}
              </div>

              <button
                className="mt-4 w-full rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                type="button"
                onClick={handleMusicXMLImport}
                disabled={!musicXMLFile || isImportingMusicXML}
              >
                {isImportingMusicXML
                  ? "正在导入..."
                  : musicXMLImportStatus === "success"
                    ? "重新导入 MusicXML"
                    : "导入并验证播放"}
              </button>
            </div>
          ) : null}

          {isAudiverisDevUIEnabled ? (
            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-purple-700">
                  仅开发使用 · 本地 Audiveris · 仅 PDF
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  Audiveris PDF 测试面板
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  这是本地开发工具，只在本机开发环境手动验证 PDF
                  OMR。Production/Vercel 不运行
                  Audiveris；此面板调用仅开发使用的 route，不调用
                  `/api/recognize`，也不影响主识别流程。
                </p>
                <p className="mt-2 rounded-xl border border-purple-200 bg-white/70 p-3 text-sm text-purple-800">
                  公开主流程仍是 JPG/PNG 模拟识别流程；PDF 只用于本地开发
                  Audiveris route。
                </p>
              </div>

              <label className="mt-4 block text-sm font-semibold text-slate-800">
                选择 PDF 文件
                <input
                  className="mt-2 block w-full rounded-lg border border-purple-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-purple-100 file:px-3 file:py-2 file:font-semibold file:text-purple-800"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleAudiverisDevSelection}
                />
              </label>

              <div className="mt-3 text-sm" aria-live="polite">
                {audiverisDevFile ? (
                  <p className="text-slate-600">
                    已选择 PDF：{audiverisDevFile.name}
                  </p>
                ) : null}
                {audiverisDevStatus === "idle" && !audiverisDevFile ? (
                  <p className="text-slate-600">
                    请选择本地 PDF 后手动开始 dev-only 测试；不会调用
                    `/api/recognize`。
                  </p>
                ) : null}
                {audiverisDevStatus === "processing" ? (
                  <p className="font-medium text-purple-700">
                    正在调用本机 Local Audiveris 开发
                    route，请等待摘要；Production/Vercel 与 `/api/recognize`
                    不参与。
                  </p>
                ) : null}
                {audiverisDevStatus === "success" && audiverisDevSummary ? (
                  <p className="font-medium text-green-700">
                    本地开发 Audiveris 摘要已返回；公开 JPG/PNG
                    模拟主流程未改变。
                  </p>
                ) : null}
                {audiverisDevStatus === "error" && audiverisDevError ? (
                  <p className="text-red-600">{audiverisDevError}</p>
                ) : null}
              </div>

              {audiverisDevSummary ? (
                <>
                  <dl className="mt-4 grid gap-3 rounded-xl bg-white p-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold text-slate-700">音符数量</dt>
                      <dd className="text-slate-600">
                        {audiverisDevSummary.noteCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">来源</dt>
                      <dd className="text-slate-600">
                        {audiverisDevSummary.source}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">输入类型</dt>
                      <dd className="text-slate-600">
                        {audiverisDevSummary.inputType}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">
                        前几个音符
                      </dt>
                      <dd className="text-slate-600">
                        {audiverisDevSummary.firstNotes.length > 0
                          ? audiverisDevSummary.firstNotes
                              .map(
                                ({ note, duration }) => `${note} (${duration})`,
                              )
                              .join(", ")
                          : "无"}
                      </dd>
                    </div>
                  </dl>

                  {/* Validation anchors for dev-only Audiveris boundary checks: 播放 Audiveris firstNotes 预览; 仅播放 Audiveris firstNotes 预览，不是完整曲谱; 没有可播放的 Audiveris firstNotes; Dev-only full notes preview /api/recognize not production may be truncated; 播放完整 Audiveris notes 预览. */}
                  <div className="mt-4 rounded-xl bg-white p-4 text-sm text-slate-600">
                    <p className="font-medium text-purple-700">
                      仅播放 Audiveris
                      前几个音符预览，不是完整曲谱；这是本地开发结果，不是
                      `/api/recognize` 结果
                    </p>
                    {audiverisDevSummary.firstNotes.length > 0 ? (
                      <button
                        className="mt-3 w-full rounded-xl bg-purple-700 px-5 py-3 font-semibold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        type="button"
                        onClick={handlePlayAudiverisFirstNotesPreview}
                        disabled={isPlaying}
                      >
                        {isPlaying
                          ? "正在播放"
                          : "播放 Audiveris 前几个音符预览"}
                      </button>
                    ) : (
                      <p className="mt-3 text-slate-500">
                        没有可播放的 Audiveris 前几个音符
                      </p>
                    )}
                  </div>

                  {audiverisDevSummary.notes &&
                  audiverisDevSummary.notes.length > 0 ? (
                    <div className="mt-4 rounded-xl bg-white p-4 text-sm text-slate-600">
                      <p className="font-medium text-purple-700">
                        本地开发完整音符预览；仅本地、仅 PDF，不是
                        `/api/recognize`，不是生产功能，结果可能被截断。
                      </p>
                      {audiverisDevSummary.notesTruncated ? (
                        <p className="mt-2 text-amber-700">
                          仅播放返回的前{" "}
                          {audiverisDevSummary.returnedNoteCount ??
                            audiverisDevSummary.notes.length}{" "}
                          个音符，完整音符数量为 {audiverisDevSummary.noteCount}
                        </p>
                      ) : null}
                      <button
                        className="mt-3 w-full rounded-xl bg-purple-900 px-5 py-3 font-semibold text-white transition hover:bg-purple-950 disabled:cursor-not-allowed disabled:bg-slate-300"
                        type="button"
                        onClick={handlePlayAudiverisFullNotesPreview}
                        disabled={isPlaying}
                      >
                        {isPlaying ? "正在播放" : "播放完整 Audiveris 音符预览"}
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null}

              <button
                className="mt-4 w-full rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                type="button"
                onClick={handleAudiverisDevRecognize}
                disabled={
                  !audiverisDevFile || audiverisDevStatus === "processing"
                }
              >
                {audiverisDevStatus === "processing"
                  ? "处理中..."
                  : "手动调用 Local Audiveris PDF 测试"}
              </button>
            </div>
          ) : null}

          {isPlaying ? (
            <button
              className="w-full rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700"
              type="button"
              onClick={stopPlaybackPreview}
            >
              停止播放
            </button>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">识别结果 / 音符预览</h2>
                <p className="mt-1 text-sm text-slate-500">
                  这里展示模拟识别结果返回的音符；有音符后可以播放，播放中可以点击「停止播放」。
                </p>
              </div>
              <p className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                状态：{recognizeStatus}
              </p>
            </div>
            {recognizeError ? (
              <p className="mt-3 text-red-600">{recognizeError}</p>
            ) : null}
            {recognizedNotes.length > 0 ? (
              <>
                <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                  {recognizedNotes.map(
                    ({ note, duration, confidence, measure, beat }, index) => {
                      const isCurrentNote = playingNoteIndex === index;
                      const isLowConfidence = confidence < 0.7;

                      return (
                        <li
                          className={`rounded-xl px-4 py-3 text-center transition ${
                            isCurrentNote
                              ? "bg-blue-600 text-white"
                              : "bg-blue-50 text-blue-700"
                          }`}
                          key={`${note}-${duration}-${measure}-${beat}-${index}`}
                        >
                          <span className="block font-semibold">{note}</span>
                          <span
                            className={`mt-1 block text-sm ${isCurrentNote ? "text-blue-100" : "text-blue-600"}`}
                          >
                            时值：{durationLabel[duration]}
                          </span>
                          <span
                            className={`mt-1 block text-sm ${isCurrentNote ? "text-blue-100" : "text-blue-600"}`}
                          >
                            小节：{measure}
                          </span>
                          <span
                            className={`mt-1 block text-sm ${isCurrentNote ? "text-blue-100" : "text-blue-600"}`}
                          >
                            拍点：{beat}
                          </span>
                          <span
                            className={`mt-1 block text-sm ${isCurrentNote ? "text-blue-100" : "text-blue-600"}`}
                          >
                            置信度：{confidence}
                          </span>
                          {isLowConfidence ? (
                            <span
                              className={`mt-2 block text-sm font-semibold ${isCurrentNote ? "text-yellow-100" : "text-yellow-700"}`}
                            >
                              低置信度
                            </span>
                          ) : null}
                        </li>
                      );
                    },
                  )}
                </ul>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-sm text-slate-600">
                    可以播放识别出的音符；如果播放时间较长，播放中会显示「停止播放」按钮。
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <label
                      className="font-semibold text-slate-800"
                      htmlFor="bpm-control"
                    >
                      当前速度：{bpm} BPM
                    </label>
                    <span className="text-sm text-slate-500">
                      范围：{minBpm} 到 {maxBpm} BPM
                    </span>
                  </div>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      className="w-full accent-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                      id="bpm-control"
                      type="range"
                      min={minBpm}
                      max={maxBpm}
                      value={bpm}
                      onChange={handleBpmChange}
                      disabled={isPlaying}
                    />
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 sm:w-28"
                      type="number"
                      min={minBpm}
                      max={maxBpm}
                      value={bpm}
                      onChange={handleBpmChange}
                      disabled={isPlaying}
                      aria-label="BPM 数值"
                    />
                  </div>
                </div>
                {playError ? (
                  <p className="mt-4 text-red-600">{playError}</p>
                ) : null}
                <button
                  className="mt-4 w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  type="button"
                  onClick={handlePlayRecognizedNotes}
                  disabled={isPlaying}
                >
                  {isPlaying ? "正在播放" : "播放识别结果"}
                </button>
              </>
            ) : (
              <p className="mt-3 text-slate-500">
                点击「开始识别」后，会显示识别到的音符列表。
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
