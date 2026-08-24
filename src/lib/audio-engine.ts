import * as Tone from 'tone';
import type { IAudioEngine } from '../core/plugin';
import { registry } from '../core/registry';

type AudioState = 'stopped' | 'playing' | 'paused';

interface SynthNode {
  synth: Tone.Synth | Tone.PolySynth | Tone.NoiseSynth;
  volume: Tone.Volume;
}

export class AudioEngine {
  private state: AudioState = 'stopped';
  private currentEngine: IAudioEngine | null = null;
  private synthNodes: SynthNode[] = [];
  private loop: Tone.Loop | null = null;
  private sequenceData: number[] = [];
  private index = 0;
  private scaleNotes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'];

  async init(engineId: string): Promise<void> {
    this.stop();
    await Tone.start();
    this.currentEngine = registry.get(engineId) as IAudioEngine | undefined ?? null;
  }

  setSequence(values: number[]): void {
    this.sequenceData = values;
    this.index = 0;
  }

  play(): void {
    if (this.state === 'playing') return;
    if (!this.currentEngine) return;

    this.dispose();
    this.createSynths();
    this.startLoop();
    this.state = 'playing';
  }

  pause(): void {
    if (this.state !== 'playing') return;
    Tone.Transport.pause();
    this.state = 'paused';
  }

  resume(): void {
    if (this.state !== 'paused') return;
    Tone.Transport.start();
    this.state = 'playing';
  }

  stop(): void {
    this.loop?.stop();
    this.loop?.dispose();
    this.loop = null;
    Tone.Transport.stop();
    Tone.Transport.cancel();
    this.dispose();
    this.state = 'stopped';
    this.index = 0;
  }

  getState(): AudioState {
    return this.state;
  }

  private createSynths(): void {
    if (!this.currentEngine) return;

    const engine = this.currentEngine;
    const tempo = engine.params.find((p) => p.id === 'tempo')?.default as number ?? 80;
    Tone.Transport.bpm.value = tempo;

    switch (engine.audioType) {
      case 'generative':
      case 'melodic': {
        const synth = new Tone.PolySynth(Tone.Synth).toDestination();
        synth.volume.value = -12;
        this.synthNodes.push({ synth, volume: synth.volume as unknown as Tone.Volume });
        break;
      }
      case 'ambient': {
        const synth = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 2, decay: 0.5, sustain: 0.8, release: 3 },
        }).toDestination();
        synth.volume.value = -18;
        this.synthNodes.push({ synth, volume: synth.volume as unknown as Tone.Volume });
        break;
      }
      case 'rhythmic': {
        const hihat = new Tone.NoiseSynth({
          noise: { type: 'white' },
          envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.02 },
        }).toDestination();
        hihat.volume.value = -10;
        this.synthNodes.push({ synth: hihat, volume: hihat.volume as unknown as Tone.Volume });
        break;
      }
    }
  }

  private startLoop(): void {
    if (this.synthNodes.length === 0) return;

    const engine = this.currentEngine;
    if (!engine) return;

    const density = engine.params.find((p) => p.id === 'density')?.default as number ?? 3;

    this.loop = new Tone.Loop((time) => {
      if (this.sequenceData.length === 0) return;
      const noteIndex = this.index % this.sequenceData.length;
      const value = this.sequenceData[noteIndex];
      const normalizedValue = Math.abs(value) % 12;
      const scaleIndex = normalizedValue % this.scaleNotes.length;
      const note = this.scaleNotes[scaleIndex];

      if (engine.audioType === 'rhythmic') {
        const synth = this.synthNodes[0]?.synth;
        if (synth && 'triggerAttack' in synth) {
          (synth as Tone.NoiseSynth).triggerAttackRelease('16n', time);
        }
      } else {
        const synth = this.synthNodes[0]?.synth;
        if (synth && 'triggerAttackRelease' in synth) {
          (synth as Tone.PolySynth).triggerAttackRelease(note, '8n', time);
        }
      }

      this.index += density;
    }, '8n');

    this.loop.start(0);
    Tone.Transport.start();
  }

  private dispose(): void {
    for (const node of this.synthNodes) {
      node.synth.dispose();
    }
    this.synthNodes = [];
  }
}

export const audioEngine = new AudioEngine();
