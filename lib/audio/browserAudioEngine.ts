type AudioContextFactory = () => AudioContext;

export type BrowserAudioPreparationError =
  | "不支持本地音频"
  | "音频已关闭"
  | "无法启动本地音频";

const stopSource = (source: AudioScheduledSourceNode) => {
  try {
    source.stop();
  } catch {
    // A scheduled source may already have stopped.
  }
};

export class BrowserAudioChannel {
  private readonly sources = new Map<AudioScheduledSourceNode, AudioNode[]>();

  constructor(private readonly engine: SharedBrowserAudioEngine) {}

  getContext() {
    return this.engine.getContext();
  }

  prepareForUserGesture() {
    return this.engine.prepareForUserGesture();
  }

  trackSource<T extends AudioScheduledSourceNode>(
    source: T,
    disconnectNodes: AudioNode[] = [],
  ): T {
    this.sources.set(source, disconnectNodes);
    this.engine.markChannelActive(this);
    source.addEventListener(
      "ended",
      () => this.releaseSource(source),
      { once: true },
    );
    return source;
  }

  stop() {
    this.sources.forEach((_disconnectNodes, source) => {
      stopSource(source);
      this.releaseSource(source);
    });
    this.engine.markChannelInactive(this);
  }

  private releaseSource(source: AudioScheduledSourceNode) {
    const disconnectNodes = this.sources.get(source);
    if (!disconnectNodes) return;
    this.sources.delete(source);
    source.disconnect();
    disconnectNodes.forEach((node) => node.disconnect());
    if (this.sources.size === 0) this.engine.markChannelInactive(this);
  }
}

export class SharedBrowserAudioEngine {
  private context: AudioContext | null = null;
  private preparation: Promise<AudioContext> | null = null;
  private readonly activeChannels = new Set<BrowserAudioChannel>();

  constructor(
    private readonly contextFactory: AudioContextFactory = () =>
      new AudioContext(),
  ) {}

  getContext() {
    if (!this.context || this.context.state === "closed") {
      this.context = this.contextFactory();
    }
    return this.context;
  }

  prepareForUserGesture(): Promise<AudioContext> {
    const context = this.getContext();
    if (context.state === "running") return Promise.resolve(context);
    if (context.state === "closed") {
      return Promise.reject(new Error("音频已关闭"));
    }
    if (this.preparation) return this.preparation;

    try {
      const resumeResult = context.resume();
      this.preparation = Promise.resolve(resumeResult)
        .then(() => {
          if (context.state !== "running") {
            throw new Error("无法启动本地音频");
          }
          return context;
        })
        .catch(() => {
          throw new Error("无法启动本地音频");
        })
        .finally(() => {
          this.preparation = null;
        });
      return this.preparation;
    } catch {
      return Promise.reject(new Error("无法启动本地音频"));
    }
  }

  createChannel() {
    return new BrowserAudioChannel(this);
  }

  markChannelActive(channel: BrowserAudioChannel) {
    this.activeChannels.add(channel);
  }

  markChannelInactive(channel: BrowserAudioChannel) {
    this.activeChannels.delete(channel);
  }

  stopAll() {
    Array.from(this.activeChannels).forEach((channel) => channel.stop());
  }

  async suspendAll() {
    this.stopAll();
    const context = this.context;
    if (!context || context.state !== "running") return;
    try {
      await context.suspend();
    } catch {
      // The next user gesture can create or resume a fresh context.
    }
  }
}

const sharedBrowserAudioEngine = new SharedBrowserAudioEngine();

export const createBrowserAudioChannel = () =>
  sharedBrowserAudioEngine.createChannel();

export const stopAllBrowserAudio = () => sharedBrowserAudioEngine.stopAll();

export const suspendAllBrowserAudio = () =>
  sharedBrowserAudioEngine.suspendAll();
