import { AIRecognizer } from "./aiRecognizer";
import { MockRecognizer } from "./mockRecognizer";
import type { Recognizer } from "./types";

export type RecognizerProvider = "mock" | "ai";

const defaultProvider: RecognizerProvider = "mock";

export function createRecognizer(provider: RecognizerProvider = defaultProvider): Recognizer {
  switch (provider) {
    case "mock":
      return new MockRecognizer();
    case "ai":
      return new AIRecognizer();
  }
}

export function getRecognizer(): Recognizer {
  return createRecognizer(defaultProvider);
}
