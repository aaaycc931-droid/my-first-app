import { noteNameToMidi } from "../audio/noteFrequency";
import {
  BoundedPianoSampleCache,
  COMPATIBILITY_PIANO_VOICE_PROVIDER,
  createCachedPianoSampleLoader,
  createFallbackPianoVoiceProvider,
  createSamplePianoVoiceProvider,
  type PianoSampleZone,
  type PianoSampleVoiceProfile,
  type PianoTimbreDescriptor,
  type PianoVoiceProvider,
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

const createProfileDescriptor = (
  id: string,
  displayName: string,
  profileDescription: string,
): PianoTimbreDescriptor => ({
  ...SPLENDID_GRAND_PIANO_TIMBRE,
  id,
  displayName,
  baseTimbreId: SPLENDID_GRAND_PIANO_TIMBRE.id,
  profileDescription,
});

export const SPLENDID_GRAND_PIANO_PROFILE_TIMBRES = [
  SPLENDID_GRAND_PIANO_TIMBRE,
  createProfileDescriptor("splendid-grand-bright-v1", "明亮钢琴预设", "高频略增强，适合辨认音头"),
  createProfileDescriptor("splendid-grand-mellow-v1", "柔和钢琴预设", "低通柔化高频，适合长时间练习"),
  createProfileDescriptor("splendid-grand-close-v1", "近场练习预设", "较轻输出与短起音，减少听觉遮蔽"),
  createProfileDescriptor("splendid-grand-vintage-v1", "复古钢琴预设", "更窄频宽与较长释放"),
  createProfileDescriptor("splendid-grand-short-v1", "清脆短音预设", "较短释放，适合节奏与快速音型"),
] as const;

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
      minMidi: index === 0 ? 9 : Math.floor((previous + rootMidi) / 2) + 1,
      maxMidi: index === roots.length - 1 ? 120 : Math.floor((rootMidi + next) / 2),
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

const profileConfigs: readonly PianoSampleVoiceProfile[] = [
  {},
  { gainMultiplier: 0.9, filter: { type: "highshelf", frequencyHz: 2_400, gainDb: 4 } },
  { gainMultiplier: 0.94, attackSeconds: 0.008, releaseSeconds: 0.14, filter: { type: "lowpass", frequencyHz: 3_200 } },
  { gainMultiplier: 0.78, attackSeconds: 0.012, releaseSeconds: 0.09, filter: { type: "lowpass", frequencyHz: 5_200 } },
  { gainMultiplier: 0.88, attackSeconds: 0.018, releaseSeconds: 0.2, filter: { type: "lowpass", frequencyHz: 2_400, q: 0.9 } },
  { gainMultiplier: 0.92, releaseSeconds: 0.035, filter: { type: "highpass", frequencyHz: 420, q: 0.6 } },
];

export const LOCAL_PIANO_TIMBRE_PROVIDERS: readonly PianoVoiceProvider[] =
  SPLENDID_GRAND_PIANO_PROFILE_TIMBRES.map((descriptor, index) =>
    createFallbackPianoVoiceProvider(
      createSamplePianoVoiceProvider({
        descriptor,
        zones: SPLENDID_GRAND_PIANO_ZONES,
        loadSample,
        profile: profileConfigs[index],
      }),
      COMPATIBILITY_PIANO_VOICE_PROVIDER,
    ),
  );

export const SPLENDID_GRAND_PIANO_PROVIDER = LOCAL_PIANO_TIMBRE_PROVIDERS[0];
