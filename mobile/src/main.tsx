import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../../app/globals.css";
import "./mobile.css";
import { App } from "./App";

const root = document.getElementById("root");

if (!root) throw new Error("移动端应用入口不存在");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
