/**
 * Quiet audio bus. No music. No required files.
 * Regional ambience starts only after a user gesture.
 */

export function createAudio(options = {}) {
  const reduced = Boolean(options.reducedMotion);
  let ctx = null;
  let master = null;
  let enabled = false;
  let muted = false;
  let creek = null;
  let wind = null;
  let regionId = "cedar-hollow";
  let night = false;
  let stepAt = 0;

  function ensure() {
    if (reduced || muted) return null;
    const AC = options.AudioContext || globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.08;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function noiseBuffer(seconds = 1) {
    const audio = ensure();
    if (!audio) return null;
    const length = Math.floor(audio.sampleRate * seconds);
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      last = last * 0.96 + (Math.random() * 2 - 1) * 0.04;
      data[i] = last;
    }
    return buffer;
  }

  function startLoop(kind) {
    const audio = ensure();
    if (!audio || !master) return null;
    const src = audio.createBufferSource();
    src.buffer = noiseBuffer(kind === "creek" ? 1.4 : 2.2);
    src.loop = true;
    const filter = audio.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = kind === "creek" ? 780 : 240;
    filter.Q.value = kind === "creek" ? 0.7 : 0.4;
    const gain = audio.createGain();
    gain.gain.value = 0.01;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
    return { src, gain };
  }

  function mixForPlace() {
    if (!creek || !wind) return;
    const mixes = {
      "cedar-hollow": { creek: 0.22, wind: 0.08 },
      "high-country": { creek: 0.06, wind: 0.2 },
      "sunfall-desert": { creek: 0.0, wind: night ? 0.08 : 0.16 },
      "dark-sky-basin": { creek: 0.0, wind: 0.11 }
    };
    const mix = mixes[regionId] || mixes["cedar-hollow"];
    creek.gain.gain.value = mix.creek;
    wind.gain.gain.value = mix.wind;
  }

  function blip(freq, dur, vol = 0.08, type = "sine") {
    const audio = ensure();
    if (!audio || !master || !enabled) return;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.value = vol;
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(audio.currentTime + dur);
  }

  return {
    unlock() {
      if (reduced) return;
      enabled = true;
      const audio = ensure();
      if (!audio) return;
      if (!creek) creek = startLoop("creek");
      if (!wind) wind = startLoop("wind");
      mixForPlace();
    },
    setPlace(id, isNight = false) {
      regionId = id || regionId;
      night = Boolean(isNight);
      mixForPlace();
    },
    setMuted(value) {
      muted = Boolean(value);
      if (master) master.gain.value = muted ? 0 : 0.08;
    },
    isMuted() {
      return muted;
    },
    discover() {
      blip(520, 0.18, 0.06);
      blip(740, 0.22, 0.04);
    },
    tablet() {
      blip(210, 0.12, 0.04, "triangle");
    },
    measure() {
      blip(340, 0.1, 0.05, "square");
    },
    map() {
      blip(160, 0.14, 0.04);
    },
    notebook() {
      blip(280, 0.08, 0.035);
    },
    footstep(now, kind = "soil") {
      if (!enabled || muted || now - stepAt < 0.3) return;
      stepAt = now;
      const freq = kind === "rock" ? 70 : kind === "water" ? 140 : 90;
      blip(freq, 0.055, 0.028, "triangle");
    },
    stop() {
      try {
        creek?.src.stop();
        wind?.src.stop();
      } catch {
        /* already stopped */
      }
      creek = null;
      wind = null;
    }
  };
}
