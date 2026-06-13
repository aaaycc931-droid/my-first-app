"use client";

import { ChangeEvent, useState } from "react";

const mockNotes = ["C4", "D4", "E4"];

export default function Home() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [recognizedNotes, setRecognizedNotes] = useState<string[]>([]);

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setFileName(file.name);
    setRecognizedNotes([]);
  };

  const handleRecognize = () => {
    setRecognizedNotes(mockNotes);
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
            <input className="sr-only" type="file" accept="image/*" onChange={handleImageUpload} />
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
            disabled={!previewUrl}
          >
            开始识别
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold">识别结果</h2>
            {recognizedNotes.length > 0 ? (
              <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                {recognizedNotes.map((note) => (
                  <li className="rounded-xl bg-blue-50 px-4 py-3 text-center font-semibold text-blue-700" key={note}>
                    {note}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-slate-500">点击“开始识别”后，会显示识别到的音符列表。</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
