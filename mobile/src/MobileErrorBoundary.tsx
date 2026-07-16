import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class MobileErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Do not show stack traces or device details in the local user interface.
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10 text-slate-950">
        <p className="text-sm font-bold text-indigo-700">本地应用恢复</p>
        <h1 className="mt-2 text-3xl font-black">此页面没有正常打开</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          你的练习内容没有上传。可以返回首页，或重新打开本地应用后再试。
        </p>
        <button
          type="button"
          onClick={() => {
            window.location.hash = "#home";
            this.setState({ hasError: false });
          }}
          className="mt-6 min-h-12 rounded-xl bg-indigo-700 px-4 py-3 font-bold text-white"
        >
          返回练习首页
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-3 min-h-12 rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-800"
        >
          重新载入本地应用
        </button>
      </main>
    );
  }
}
