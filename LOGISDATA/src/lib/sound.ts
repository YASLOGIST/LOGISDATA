/**
 * Procedural Web Audio API sound synthesizer for the control room.
 *
 * Requirements & design rules:
 * - Zero external audio file downloads or bandwidth cost.
 * - Respects user preferences: muted by default, easy toggle in the UI with persistence.
 * - Completely safe under SSR / jsdom / environments where AudioContext is unavailable.
 * - Smooth exponential gain envelopes to guarantee zero clicking or audio clipping.
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private enabled = false;

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("logisdata_sound_enabled");
      this.enabled = stored === "true";
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("logisdata_sound_enabled", String(this.enabled));
    }
    if (this.enabled) {
      this.initContext();
      this.playTone(880, 0.08, "sine", 0.05);
    }
    return this.enabled;
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
    if (typeof window !== "undefined") {
      localStorage.setItem("logisdata_sound_enabled", String(this.enabled));
    }
  }

  private initContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = "sine",
    gainLevel = 0.06,
    targetFreq?: number,
  ): void {
    if (!this.enabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (targetFreq) {
        osc.frequency.exponentialRampToValueAtTime(targetFreq, now + duration);
      }

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainLevel, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.01);
    } catch {
      // Audio context policy safe catch
    }
  }

  public playClick(): void {
    this.playTone(1200, 0.03, "triangle", 0.04);
  }

  public playHover(): void {
    this.playTone(600, 0.02, "sine", 0.015);
  }

  public playScenarioSwitch(): void {
    this.playTone(440, 0.12, "sine", 0.05, 880);
  }

  public playAuditScan(): void {
    this.playTone(800, 0.18, "sine", 0.04, 1400);
  }

  public playAlert(): void {
    this.playTone(320, 0.16, "sawtooth", 0.035, 240);
  }

  public playSuccess(): void {
    this.playTone(523.25, 0.08, "sine", 0.04);
    setTimeout(() => this.playTone(659.25, 0.08, "sine", 0.04), 60);
    setTimeout(() => this.playTone(1046.5, 0.14, "sine", 0.05), 120);
  }
}

export const sound = new SoundSynthesizer();
