import { noteNameToMidi } from "../audio/noteFrequency";
import {
  BoundedPianoSampleCache,
  COMPATIBILITY_PIANO_VOICE_PROVIDER,
  createCachedPianoSampleLoader,
  createFallbackPianoVoiceProvider,
  createSamplePianoVoiceProvider,
  type PianoSampleZone,
  type PianoTimbreDescriptor,
} from "./pianoAudioProvider";

export const SPLENDID_GRAND_PIANO_TIMBRE: PianoTimbreDescriptor = {
  id: "splendid-grand-piano-mobile-v1",
  version: "1.0.0",
  displayName: "Splendid Grand Piano 三层采样",
  kind: "sampled",
  attribution: "Splendid Grand Piano；浏览器转换由 danigb/samples 提供",
  license: "Public Domain",
  source: "https://github.com/danigb/samples/tree/eae8c5c7a10f4b0e06281211e704c36c30e25342/audio/splendid-grand-piano",
};

const roots = ["A0", "E1", "B1", "F2", "C3", "G3", "C4", "G4", "D5", "A5", "F6", "A#6"] as const;
const layers = [
  { prefix: "PP", minVelocity: 0, maxVelocity: 0.34, gain: 0.75 },
  { prefix: "Mp", minVelocity: 0.34, maxVelocity: 0.67, gain: 0.7 },
  { prefix: "Mf", minVelocity: 0.67, maxVelocity: 1, gain: 0.64 },
] as const;

const rootMidis = roots.map((note) => {
  const midi = noteNameToMidi(note);
  if (midi === null) throw new Error(`采样根音无效：${note}`);
  return midi;
});

export const SPLENDID_GRAND_PIANO_ZONES: readonly PianoSampleZone[] = layers.flatMap((layer) =>
  roots.map((note, index) => {
    const rootMidi = rootMidis[index];
    const previous = rootMidis[index - 1];
    const next = rootMidis[index + 1];
    return {
      id: `${layer.prefix}-${note}`,
      rootMidi,
      minMidi: index === 0 ? 21 : Math.floor((previous + rootMidi) / 2) + 1,
      maxMidi: index === roots.length - 1 ? 108 : Math.floor((rootMidi + next) / 2),
      minVelocity: layer.minVelocity,
      maxVelocity: layer.maxVelocity,
      assetPath: `/piano/splendid-grand-v1/${layer.prefix}-${note.replace("#", "%23")}.ogg`,
      gain: layer.gain,
    };
  }),
);

const cache = new BoundedPianoSampleCache<AudioBuffer>(24);
const loadSample = createCachedPianoSampleLoader({
  cache,
  async fetchAsset(context, assetPath) {
    const response = await fetch(assetPath, { cache: "force-cache" });
    if (!response.ok) throw new Error(`钢琴采样加载失败：${response.status}`);
    return context.decodeAudioData(await response.arrayBuffer());
  },
});

export const SPLENDID_GRAND_PIANO_PROVIDER = createFallbackPianoVoiceProvider(
  createSamplePianoVoiceProvider({ descriptor: SPLENDID_GRAND_PIANO_TIMBRE, zones: SPLENDID_GRAND_PIANO_ZONES, loadSample }),
  COMPATIBILITY_PIANO_VOICE_PROVIDER,
);
