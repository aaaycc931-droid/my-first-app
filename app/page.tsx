"use client";

import { ChangeEvent, useState } from "react";

import type { RecognizedNote, RecognizeResponse } from "../lib/recognition";

type RecognizeStatus = "未上传" | "已上传" | "识别中" | "识别完成" | "识别失败";
type MusicXMLImportStatus = "idle" | "importing" | "success" | "error";

type ToneSynth = {
  toDestination: () => ToneSynth;
  triggerAttackRelease: (note: string, duration: number, time: number) => void;
  dispose: () => void;
};

type ToneModule = {
  Synth: new () => ToneSynth;
  now: () => number;
  start: () => Promise<void>;
};

const toneModuleUrl = "https://esm.sh/tone@15.1.22";

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

const calculateDurationSeconds = (duration: RecognizedNote["duration"], bpm: number) =>
  durationToBeats[duration] * (60 / bpm);

const durationLabel: Record<RecognizedNote["duration"], string> = {
  eighth: "八分音符",
  quarter: "四分音符",
  half: "二分音符",
  whole: "全音符",
};

const loadTone = async () =>
  (await import(/* webpackIgnore: true */ toneModuleUrl)) as ToneModule;

export default function Home() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [recognizedNotes, setRecognizedNotes] = useState<RecognizedNote[]>([]);
  const [recognizeStatus, setRecognizeStatus] = useState<RecognizeStatus>("未上传");
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

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setSelectedFile(file);
    setFileName(file.name);
    setRecognizedNotes([]);
    setRecognizeStatus("已上传");
    setRecognizeError("");
    setPlayError("");
    setIsPlaying(false);
    setPlayingNoteIndex(null);
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

    if (extension === "mxl") {
      setMusicXMLImportError(
        "当前网页导入仅支持 .musicxml/.xml，请先将 .mxl 改名为 .zip 并解压出内部 XML 文件。",
      );
      setMusicXMLImportStatus("error");
      event.target.value = "";
      return;
    }

    if (extension !== "musicxml" && extension !== "xml") {
      setMusicXMLImportError("请选择 .musicxml 或 .xml 文件。");
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
      setIsPlaying(false);
      setPlayingNoteIndex(null);
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
      setRecognizeError(error instanceof Error ? error.message : "识别失败，请稍后再试。");
      setRecognizedNotes([]);
    } finally {
      setIsRecognizing(false);
    }
  };

  const handlePlayRecognizedNotes = async () => {
    if (recognizedNotes.length === 0 || isPlaying) {
      return;
    }

    setIsPlaying(true);
    setPlayError("");
    setPlayingNoteIndex(null);

    try {
      const Tone = await loadTone();
      await Tone.start();

      const synth = new Tone.Synth().toDestination();
      const startTime = Tone.now();
      let offset = 0;

      recognizedNotes.forEach(({ note, duration }, index) => {
        const noteOffset = offset;

        const noteDuration = calculateDurationSeconds(duration, bpm);

        synth.triggerAttackRelease(note, noteDuration, startTime + noteOffset);
        window.setTimeout(() => {
          setPlayingNoteIndex(index);
        }, noteOffset * 1000);

        offset += noteDuration;
      });

      window.setTimeout(() => {
        synth.dispose();
        setPlayingNoteIndex(null);
        setIsPlaying(false);
      }, offset * 1000 + 500);
    } catch {
      setPlayError("播放失败，请稍后再试。");
      setPlayingNoteIndex(null);
      setIsPlaying(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <div className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold text-blue-600">五线谱识别 MVP</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">上传五线谱图片</h1>
          <p className="mt-3 text-slate-600">当前为 MVP 演示流程：图片识别接口仍返回模拟音符数据，用于验证上传、结果展示和播放链路；真实五线谱图片识别 / OMR 尚未完成。</p>
        </div>

        <div className="mt-6 space-y-6">
          <label className="block rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-blue-400 hover:bg-blue-50/50">
            <span className="block text-base font-semibold text-slate-800">选择图片</span>
            <span className="mt-2 block text-sm text-slate-500">支持常见图片格式，用于预览和后续识别</span>
            <input className="sr-only" type="file" accept="image/jpeg,image/png" onChange={handleImageUpload} />
          </label>

          {previewUrl ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold">图片预览</h2>
                <p className="text-sm text-slate-500">{fileName}</p>
              </div>
              <img className="max-h-[420px] w-full rounded-xl object-contain ring-1 ring-slate-200" src={previewUrl} alt="上传的五线谱预览" />
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">上传后会在这里显示图片预览。</div>
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
                  Experimental
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  Import MusicXML
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  仅用于开发验证，文件最大 2 MB。支持 .musicxml/.xml；.mxl 请先改名为
                  .zip，并解压出内部 XML 文件。
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
                    请选择 .musicxml 或 .xml 文件。
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

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold">识别结果</h2>
              <p className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">状态：{recognizeStatus}</p>
            </div>
            {recognizeError ? <p className="mt-3 text-red-600">{recognizeError}</p> : null}
            {recognizedNotes.length > 0 ? (
              <>
                <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                  {recognizedNotes.map(({ note, duration, confidence, measure, beat }, index) => {
                    const isCurrentNote = playingNoteIndex === index;
                    const isLowConfidence = confidence < 0.7;

                    return (
                      <li
                        className={`rounded-xl px-4 py-3 text-center transition ${
                          isCurrentNote ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700"
                        }`}
                        key={`${note}-${duration}-${measure}-${beat}-${index}`}
                      >
                        <span className="block font-semibold">{note}</span>
                        <span className={`mt-1 block text-sm ${isCurrentNote ? "text-blue-100" : "text-blue-600"}`}>时值：{durationLabel[duration]}</span>
                        <span className={`mt-1 block text-sm ${isCurrentNote ? "text-blue-100" : "text-blue-600"}`}>小节：{measure}</span>
                        <span className={`mt-1 block text-sm ${isCurrentNote ? "text-blue-100" : "text-blue-600"}`}>拍点：{beat}</span>
                        <span className={`mt-1 block text-sm ${isCurrentNote ? "text-blue-100" : "text-blue-600"}`}>置信度：{confidence}</span>
                        {isLowConfidence ? (
                          <span className={`mt-2 block text-sm font-semibold ${isCurrentNote ? "text-yellow-100" : "text-yellow-700"}`}>低置信度</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <label className="font-semibold text-slate-800" htmlFor="bpm-control">
                      当前速度：{bpm} BPM
                    </label>
                    <span className="text-sm text-slate-500">范围：{minBpm} 到 {maxBpm} BPM</span>
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
                {playError ? <p className="mt-4 text-red-600">{playError}</p> : null}
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
              <p className="mt-3 text-slate-500">点击“开始识别”后，会显示识别到的音符列表。</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
