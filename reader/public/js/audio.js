/**
 * Realistic Procedural Page Turn Sound Generator using Web Audio API
 * Generates natural paper friction, gentle air whoosh, and soft landing thump.
 */
class PageSoundEngine {
  constructor() {
    this.audioCtx = null;
    this.enabled = localStorage.getItem('book_sound_enabled') !== 'false';
  }

  init() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('book_sound_enabled', this.enabled);
    return this.enabled;
  }

  playPageFlip(direction = 'forward') {
    if (!this.enabled) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const duration = 0.22; // 220ms page curl sound

      // 1. Noise buffer for paper rustle/friction
      const bufferSize = this.audioCtx.sampleRate * duration;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);

      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        // Pink-ish filtered noise for softer paper texture
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.03 * white) / 1.03;
        lastOut = data[i];
        // Add subtle paper crinkle bursts
        if (Math.random() < 0.02) {
          data[i] += (Math.random() * 0.4 - 0.2);
        }
      }

      const noiseNode = this.audioCtx.createBufferSource();
      noiseNode.buffer = buffer;

      // 2. Bandpass filter for paper frequency resonance (around 900Hz - 2200Hz sweep)
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 1.4;

      if (direction === 'forward') {
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(2400, now + duration * 0.4);
        filter.frequency.exponentialRampToValueAtTime(1100, now + duration);
      } else {
        filter.frequency.setValueAtTime(1800, now);
        filter.frequency.exponentialRampToValueAtTime(900, now + duration);
      }

      // 3. Gain envelope (attack -> swell -> quick decay)
      const gainNode = this.audioCtx.createGain();
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.linearRampToValueAtTime(0.18, now + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

      // 4. Subtle low-end thump for page landing on book
      const osc = this.audioCtx.createOscillator();
      const oscGain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(45, now + duration);

      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.setValueAtTime(0.05, now + 0.13);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      // Connect graph
      noiseNode.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      osc.connect(oscGain);
      oscGain.connect(this.audioCtx.destination);

      // Trigger
      noiseNode.start(now);
      noiseNode.stop(now + duration);
      osc.start(now + 0.12);
      osc.stop(now + duration);
    } catch (err) {
      console.warn('Audio playback error:', err);
    }
  }
}

window.soundEngine = new PageSoundEngine();
