import type { LocalMelodyGuideAudioSource } from "../practice/localMelodyGuideAudio";

export type MediaProjectV1 = Readonly<{
  schemaVersion: "media-project-v1";
  projectId: string;
  revision: 1;
  status: "draft" | "ready" | "error";
  localOnly: true;
  sessionOnly: true;
  source: Readonly<{
    kind: "local-audio";
    sourceId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }>;
  assets: readonly [Readonly<{
    assetId: string;
    role: "original";
    storage: "memory-only";
    immutable: true;
  }>];
  edits: readonly [];
}>;

const stableTextFingerprint = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

export function createMediaProjectFromLocalMelodyGuide(
  source: LocalMelodyGuideAudioSource,
): MediaProjectV1 {
  const identity = stableTextFingerprint(
    source.sourceId,
  );
  return {
    schemaVersion: "media-project-v1",
    projectId: `local.media-project.${identity}`,
    revision: 1,
    status:
      source.status === "decoded"
        ? "ready"
        : source.status === "error"
          ? "error"
          : "draft",
    localOnly: true,
    sessionOnly: true,
    source: {
      kind: "local-audio",
      sourceId: source.sourceId,
      fileName: source.fileName,
      mimeType: source.fileType,
      sizeBytes: source.fileSizeBytes,
    },
    assets: [{
      assetId: `local.media-asset.${identity}.original`,
      role: "original",
      storage: "memory-only",
      immutable: true,
    }],
    edits: [],
  };
}

export type ResourcePackageV1 = Readonly<{
  schemaVersion: "resource-package-v1";
  packageId: string;
  version: string;
  kind: "audio-samples";
  state: "bundled";
  source: string;
  license: string;
  sha256: string;
  sizeBytes: number;
  fileCount: number;
  deviceRequirements: readonly string[];
  removal: "remove-with-app";
}>;

const sha256Pattern = /^[0-9a-f]{64}$/;

export function validateResourcePackage(
  resourcePackage: ResourcePackageV1,
): ResourcePackageV1 {
  if (
    resourcePackage.schemaVersion !== "resource-package-v1" ||
    !resourcePackage.packageId ||
    !resourcePackage.version ||
    !resourcePackage.source ||
    !resourcePackage.license ||
    !sha256Pattern.test(resourcePackage.sha256) ||
    !Number.isInteger(resourcePackage.sizeBytes) ||
    resourcePackage.sizeBytes <= 0 ||
    !Number.isInteger(resourcePackage.fileCount) ||
    resourcePackage.fileCount <= 0 ||
    resourcePackage.deviceRequirements.length === 0
  ) {
    throw new Error("资源包缺少有效的来源、许可、摘要、大小或设备要求。");
  }
  return resourcePackage;
}

export type CapabilityResolutionV1 = Readonly<{
  schemaVersion: "capability-resolution-v1";
  capabilityId: "local-piano-audio";
  status: "available" | "fallback" | "unavailable";
  selectedProvider: "sampled-local" | "compatibility-synth" | null;
  fallbackProvider: "compatibility-synth" | null;
  reason: string;
  resourcePackageId: string | null;
}>;

export function resolveLocalPianoAudioCapability({
  webAudioAvailable,
  localAssetsEnabled,
  resourcePackage,
}: {
  webAudioAvailable: boolean;
  localAssetsEnabled: boolean;
  resourcePackage: ResourcePackageV1 | null;
}): CapabilityResolutionV1 {
  if (!webAudioAvailable) {
    return {
      schemaVersion: "capability-resolution-v1",
      capabilityId: "local-piano-audio",
      status: "unavailable",
      selectedProvider: null,
      fallbackProvider: null,
      reason: "当前运行环境不支持 Web Audio，无法启动本地钢琴声音。",
      resourcePackageId: null,
    };
  }

  if (!localAssetsEnabled || !resourcePackage) {
    return {
      schemaVersion: "capability-resolution-v1",
      capabilityId: "local-piano-audio",
      status: "fallback",
      selectedProvider: "compatibility-synth",
      fallbackProvider: null,
      reason: "本地采样资源包未启用，使用兼容合成音。",
      resourcePackageId: null,
    };
  }

  try {
    validateResourcePackage(resourcePackage);
    return {
      schemaVersion: "capability-resolution-v1",
      capabilityId: "local-piano-audio",
      status: "available",
      selectedProvider: "sampled-local",
      fallbackProvider: "compatibility-synth",
      reason: "已选择随应用固定的本地采样资源包；单个采样加载失败时自动降级为兼容合成音。",
      resourcePackageId: resourcePackage.packageId,
    };
  } catch {
    return {
      schemaVersion: "capability-resolution-v1",
      capabilityId: "local-piano-audio",
      status: "fallback",
      selectedProvider: "compatibility-synth",
      fallbackProvider: null,
      reason: "本地采样资源包完整性元数据无效，已失败关闭并使用兼容合成音。",
      resourcePackageId: null,
    };
  }
}
