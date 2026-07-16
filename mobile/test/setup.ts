import { afterEach } from "vitest";

Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
  configurable: true,
  value: true,
});

Object.defineProperty(window, "scrollTo", {
  configurable: true,
  value: () => undefined,
});

afterEach(() => {
  window.location.hash = "";
  window.localStorage.clear();
  document.body.replaceChildren();
});
