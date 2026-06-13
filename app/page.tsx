"use client";

import { ChangeEvent, useState } from "react";

type RecognizedNote = {
  note: string;
  duration: "quarter" | "half" | "whole";
  confidence: number;
  measure: number;
  beat: number;
};

type RecognizeStatus = "未上传" | "已上传" | "识别中" | "识别完成" | "识别失败";

type RecognizeResponse = {
  notes?: RecognizedNote[];
  error?: string;
};

type ToneSynth = {
  toDestination: () => ToneSynth;
  triggerAttackRelease: (note: string, duration: string, time: number) => void;
  dispose: () => void;
};

type ToneModule = {
  Synth: new () => ToneSynth;
  now: () => number;
  start: () => Promise<void>;
};

const toneModuleUrl = "https://esm.sh/tone@15.1.22";

const durationToToneValue: Record<RecognizedNote["duration"], string> = {
  quarter: "4n",
  half: "2n",
  whole: "1n",
};

const durationToSeconds: Record<RecognizedNote["duration"], number> = {
  quarter: 0.5,
  half: 1,
  whole: 2,
};

const durationLabel: Record<RecognizedNote["duration"], string> = {
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

        synth.triggerAttackRelease(note, durationToToneValue[duration], startTime + noteOffset);
        window.setTimeout(() => {
          setPlayingNoteIndex(index);
        }, noteOffset * 1000);

        offset += durationToSeconds[duration];
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
          <p className="mt-3 text-slate-600">先上传一张五线谱图片，预览确认后点击开始识别。当前版本会返回假数据。</p>
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
