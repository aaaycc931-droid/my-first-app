import { MockRecognizer } from "./mockRecognizer";
import type { Recognizer } from "./types";

export type RecognizerProvider = "mock";

const defaultProvider: RecognizerProvider = "mock";

export function createRecognizer(provider: RecognizerProvider = defaultProvider): Recognizer {
  switch (provider) {
    case "mock":
      return new MockRecognizer();
  }
}

export function getRecognizer(): Recognizer {
  return createRecognizer(defaultProvider);
}
