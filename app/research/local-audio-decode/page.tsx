import LocalAudioDecodeFileInputShell from "./LocalAudioDecodeFileInputShell";

const warningItems = [
  "这是一个浏览器本地音频解码研究预览工具。",
  "只有点击「解码音频信息」后才会解码。",
  "请先选择本地 WAV 文件，再进行音频信息解码。",
  "不上传音频。",
  "不使用云端处理。",
  "不调用 AI 接口。",
  "不使用麦克风。",
  "只有点击「提取音高帧」后，才会生成研究用音高帧诊断。",
  "不是正式旋律识别。",
  "不是正式目标音高曲线生成。",
  "不是练习模式。",
  "不是 APK-ready。",
];

const currentStatusItems = [
  "仅用于研究预览。",
  "已实现浏览器本地 decodeAudioData 音频信息解码验证。",
  "研究用音高帧诊断必须在单独点击「提取音高帧」后才会运行。",
  "AudioContext 只在用户明确点击解码时创建和使用。",
  "decodeAudioData 只会从「解码音频信息」按钮触发。",
  "文件选择界面与实际解码操作保持分离。",
  "这里不是正式练习模式集成。",
];

const futureFlowItems = [
  "手动选择本地 WAV 文件。",
  "确认只在浏览器本地处理。",
  "点击「解码音频信息」。",
  "查看时长、采样率和声道数等音频信息。",
  "如需研究诊断，再点击「提取音高帧」。",
  "查看或处理浏览器解码错误。",
  "需要时清除选择和结果。",
];

const boundaryItems = [
  "不支持 MP3。",
  "不做任意歌曲分析。",
  "不做人声分离。",
  "不从伴奏推断旋律。",
  "不提供正式产品级音高跟踪。",
  "不提供波形分析界面。",
  "不参与评分。",
  "不生成正式目标音高曲线。",
  "不实现 Song Learning Mode。",
  "不是 APK-ready 行为。",
];

export default function LocalAudioDecodeResearchPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="rounded-3xl border border-amber-300/30 bg-amber-300/10 p-6 shadow-lg shadow-black/20">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-amber-200">
            研究预览工具
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            本地音频解码研究工具
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-amber-50/90">
            这个页面用于在浏览器本地选择 WAV
            文件、解码音频信息，并生成研究用的音高诊断结果。所有操作都需要用户明确点击触发。当前结果仅用于研究预览，不是正式旋律识别，不是评分，也不是正式练习目标。
          </p>
        </header>

        <section className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold text-white">研究预览说明</h2>
          <ul className="mt-4 grid gap-3 text-slate-200 sm:grid-cols-2">
            {warningItems.map((item) => (
              <li key={item} className="rounded-2xl bg-slate-800 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <LocalAudioDecodeFileInputShell />

        <section className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold text-white">当前状态</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-200">
            {currentStatusItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold text-white">后续预期流程</h2>
          <p className="mt-3 text-slate-300">
            这些步骤描述的是当前隔离研究流程；它们仍然只是研究预览，不是正式练习模式。
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-6 text-slate-200">
            {futureFlowItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>

        <section className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold text-white">边界说明</h2>
          <p className="mt-3 text-slate-300">当前页面不支持：</p>
          <ul className="mt-4 grid gap-3 text-slate-200 sm:grid-cols-2">
            {boundaryItems.map((item) => (
              <li key={item} className="rounded-2xl bg-slate-800 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-sky-300/30 bg-sky-300/10 p-6">
          <h2 className="text-2xl font-semibold text-white">
            Android APK / WebView 注意事项
          </h2>
          <p className="mt-3 leading-7 text-sky-50/90">
            未来如果打包 Android APK，必须单独验证 Android WebView / packaged
            环境中的文件选择、AudioContext、decodeAudioData、内存限制、本地处理和权限行为；当前页面不能作为
            APK-ready 依据。
          </p>
        </section>
      </div>
    </main>
  );
}
