import { AIRecognizer } from "./aiRecognizer";
import { MockRecognizer } from "./mockRecognizer";
import { MusicXMLRecognizer } from "./musicxmlRecognizer";
import type { Recognizer } from "./types";

export type RecognizerProvider = "mock" | "ai" | "musicxml";

const defaultProvider: RecognizerProvider = "mock";

export function createRecognizer(provider: RecognizerProvider = defaultProvider): Recognizer {
  switch (provider) {
    case "mock":
      return new MockRecognizer();
    case "ai":
      return new AIRecognizer();
    case "musicxml":
      return new MusicXMLRecognizer();
  }
}

export function getRecognizer(): Recognizer {
  return createRecognizer(defaultProvider);
}
