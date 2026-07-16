type AudioContextFactory = () => AudioContext;

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

  trackSource<T extends AudioScheduledSourceNode>(
    source: T,
    disconnectNodes: AudioNode[] = [],
  ): T {
    this.sources.set(source, disconnectNodes);
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
  }

  private releaseSource(source: AudioScheduledSourceNode) {
    const disconnectNodes = this.sources.get(source);
    if (!disconnectNodes) return;
    this.sources.delete(source);
    source.disconnect();
    disconnectNodes.forEach((node) => node.disconnect());
  }
}

export class SharedBrowserAudioEngine {
  private context: AudioContext | null = null;

  constructor(
    private readonly contextFactory: AudioContextFactory = () =>
      new AudioContext(),
  ) {}

  getContext() {
    if (!this.context || this.context.state === "closed") {
      this.context = this.contextFactory();
    }
    if (this.context.state === "suspended") {
      void this.context.resume();
    }
    return this.context;
  }

  createChannel() {
    return new BrowserAudioChannel(this);
  }
}

const sharedBrowserAudioEngine = new SharedBrowserAudioEngine();

export const createBrowserAudioChannel = () =>
  sharedBrowserAudioEngine.createChannel();
