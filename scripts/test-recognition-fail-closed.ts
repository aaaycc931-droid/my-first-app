import {
  AIRecognizer,
  RecognitionProviderUnavailableError,
} from "../lib/recognition/aiRecognizer.js";
import { createRecognizer } from "../lib/recognition/recognizerFactory.js";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const run = async () => {
  const recognizer = new AIRecognizer();
  let failure: unknown;
  try {
    await recognizer.recognize({} as File);
  } catch (error) {
    failure = error;
  }
  assert(
    failure instanceof RecognitionProviderUnavailableError,
    "an unavailable AI provider must fail closed instead of returning mock notes",
  );

  const mockResponse = await createRecognizer("mock").recognize({} as File);
  assert(mockResponse.metadata?.provider === "mock", "the explicit mock provider should remain available");

  console.log("recognition fail-closed tests passed");
};

void run();
