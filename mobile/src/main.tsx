import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../../app/globals.css";
import "./mobile.css";
import { App } from "./App";
import { MobileErrorBoundary } from "./MobileErrorBoundary";

const root = document.getElementById("root");

if (!root) {
  document.body.innerHTML =
    "<main class=\"mobile-startup-fallback\"><h1>无法启动视唱练耳</h1><p>请重新打开应用；如果问题持续出现，请更新 Android System WebView。</p></main>";
} else {
  try {
    createRoot(root).render(
      <StrictMode>
        <MobileErrorBoundary>
          <App />
        </MobileErrorBoundary>
      </StrictMode>,
    );
  } catch {
    root.innerHTML =
      "<main class=\"mobile-startup-fallback\"><h1>无法启动视唱练耳</h1><p>请重新打开应用；如果问题持续出现，请更新 Android System WebView。</p></main>";
  }
}
