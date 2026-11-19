function createAudio() {
  const VOLUME = 0.38;
  const SILENCE = 0.0001;
  let context;
  let output;
  let noiseBuffer;
  let muted = false;
  const lastPlayed = new Map();

  async function unlock() {
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) return;

    try {
      if (!context) {
        context = new AudioContext();
        output = context.createGain();
        output.gain.value = muted ? 0 : VOLUME;
        output.connect(context.destination);

        noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.5), context.sampleRate);
        const samples = noiseBuffer.getChannelData(0);
        for (let i = 0; i < samples.length; i += 1) {
          samples[i] = Math.random() * 2 - 1;
        }
      }
      if (context.state !== 'running' && context.state !== 'closed') {
        await context.resume();
      }
    } catch {
      // The arena can run when the audio device or browser policy prevents playback.
    }
  }

  function setMuted(value) {
    muted = Boolean(value);
    if (output) output.gain.setTargetAtTime(muted ? 0 : VOLUME, context.currentTime, 0.012);
  }

  function envelope(start, duration, volume) {
    const voice = context.createGain();
    const attack = Math.min(0.012, duration * 0.15);
    voice.gain.setValueAtTime(SILENCE, start);
    voice.gain.linearRampToValueAtTime(volume, start + attack);
    voice.gain.exponentialRampToValueAtTime(SILENCE, start + duration);
    voice.connect(output);
    return voice;
  }

  function tone(start, duration, shape, from, to, volume) {
    const oscillator = context.createOscillator();
    const voice = envelope(start, duration, volume);
    oscillator.type = shape;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
    oscillator.connect(voice);
    oscillator.addEventListener('ended', () => voice.disconnect(), { once: true });
    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  function noise(start, duration, from, to, volume, resonance = 0.7) {
    const source = context.createBufferSource();
    const sweep = context.createBiquadFilter();
    const voice = envelope(start, duration, volume);
    source.buffer = noiseBuffer;
    sweep.type = 'bandpass';
    sweep.Q.value = resonance;
    sweep.frequency.setValueAtTime(from, start);
    sweep.frequency.exponentialRampToValueAtTime(to, start + duration);
    source.connect(sweep).connect(voice);
    source.addEventListener('ended', () => {
      sweep.disconnect();
      voice.disconnect();
    }, { once: true });
    const offset = Math.random() * (noiseBuffer.duration - duration);
    source.start(start, offset, duration);
  }

  function metal(start, pitch, duration, volume) {
    tone(start, duration, 'sine', pitch, pitch * 0.96, volume);
    tone(start, duration * 0.62, 'sine', pitch * 2.67, pitch * 2.59, volume * 0.43);
  }

  function impact(start, weight) {
    tone(start, 0.1, 'triangle', 116 - weight * 32, 43, 0.11 + weight * 0.055);
    noise(start, 0.095, 1170, 190, 0.29 + weight * 0.18);
  }

  const effects = {
    swing(at) {
      noise(at, 0.14, 1100, 380, 0.23, 1.2);
    },
    hit(at) {
      impact(at, 0.3);
      metal(at, 520, 0.075, 0.055);
    },
    bash(at) {
      impact(at, 0.8);
      metal(at, 290, 0.21, 0.14);
    },
    throw(at) {
      noise(at, 0.2, 480, 1400, 0.24, 1.6);
      metal(at + 0.035, 440, 0.2, 0.095);
    },
    ricochet(at) {
      impact(at, 0.15);
      metal(at, 690, 0.24, 0.15);
    },
    catch(at) {
      noise(at, 0.065, 880, 300, 0.21);
      metal(at, 385, 0.1, 0.082);
    },
    whirlwind(at) {
      noise(at, 0.37, 2100, 390, 0.45, 1.0);
      noise(at + 0.13, 0.27, 1200, 210, 0.36, 1.3);
      tone(at, 0.31, 'triangle', 140, 46, 0.19);
      metal(at + 0.04, 405, 0.31, 0.125);
    },
    dodge(at) {
      noise(at, 0.22, 640, 210, 0.22);
    },
    hurt(at) {
      impact(at, 0.55);
      tone(at, 0.16, 'triangle', 185, 76, 0.18);
    },
    rage(at) {
      metal(at, 440, 0.19, 0.105);
      metal(at + 0.08, 660, 0.25, 0.09);
    },
    enemyWindup(at) {
      noise(at, 0.21, 320, 680, 0.15, 2.1);
      tone(at + 0.025, 0.2, 'triangle', 74, 135, 0.1);
    },
    enemyHeavy(at) {
      impact(at, 1);
      tone(at, 0.22, 'sine', 62, 38, 0.25);
    },
    death(at) {
      noise(at, 0.23, 770, 170, 0.19);
      tone(at, 0.19, 'triangle', 112, 49, 0.14);
    },
    win(at) {
      metal(at, 330, 0.4, 0.12);
      metal(at + 0.12, 440, 0.42, 0.125);
      metal(at + 0.24, 554, 0.56, 0.13);
    },
    lose(at) {
      tone(at, 0.29, 'triangle', 208, 175, 0.15);
      tone(at + 0.14, 0.51, 'sine', 139, 98, 0.19);
    },
  };

  function play(name) {
    if (muted || !noiseBuffer || context.state === 'closed' || !Object.hasOwn(effects, name)) return;
    const now = context.currentTime;
    if (now - (lastPlayed.get(name) ?? -Infinity) < 0.04) return;
    lastPlayed.set(name, now);
    effects[name](now + 0.007);
  }

  return { unlock, setMuted, play };
}
