/**
 * Quiet audio bus. No music. No required files.
 * Procedural ambience starts only after a user gesture.
 */

export function createAudio(options = {}) {
  const reduced = Boolean(options.reducedMotion);
  let ctx = null;
  let master = null;
  let enabled = false;
  let muted = false;
  let creek = null;
  let wind = null;
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
    gain.gain.value = kind === "creek" ? 0.22 : 0.12;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
    return { src, gain };
  }

  function blip(freq, dur, vol = 0.08) {
    const audio = ensure();
    if (!audio || !master || !enabled) return;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
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
      blip(210, 0.12, 0.04);
    },
    footstep(now) {
      if (!enabled || muted || now - stepAt < 0.32) return;
      stepAt = now;
      blip(90, 0.06, 0.03);
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
