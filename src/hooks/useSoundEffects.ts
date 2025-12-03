"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SoundType = "bid" | "outbid" | "tick" | "win" | "urgent";

type SoundConfig = {
  frequency: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  ramp?: boolean;
};

const SOUND_CONFIGS: Record<SoundType, SoundConfig | SoundConfig[]> = {
  bid: {
    frequency: 880, // A5
    duration: 150,
    type: "sine",
    gain: 0.3,
  },
  outbid: [
    { frequency: 400, duration: 100, type: "sawtooth", gain: 0.2 },
    { frequency: 300, duration: 150, type: "sawtooth", gain: 0.2 },
  ],
  tick: {
    frequency: 1000,
    duration: 50,
    type: "square",
    gain: 0.1,
  },
  win: [
    { frequency: 523, duration: 150, type: "sine", gain: 0.3 }, // C5
    { frequency: 659, duration: 150, type: "sine", gain: 0.3 }, // E5
    { frequency: 784, duration: 150, type: "sine", gain: 0.3 }, // G5
    { frequency: 1047, duration: 300, type: "sine", gain: 0.3 }, // C6
  ],
  urgent: {
    frequency: 600,
    duration: 100,
    type: "square",
    gain: 0.15,
    ramp: true,
  },
};

const useSoundEffects = () => {
  const [isMuted, setIsMuted] = useState(true); // Start muted by default
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context on first user interaction
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      )();
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Play a single tone
  const playTone = useCallback(
    (config: SoundConfig, startTime: number = 0) => {
      if (isMuted) return;

      const ctx = initAudioContext();
      if (!ctx) return;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = config.type;
      oscillator.frequency.value = config.frequency;

      gainNode.gain.value = config.gain;

      if (config.ramp) {
        gainNode.gain.setValueAtTime(config.gain, ctx.currentTime + startTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          ctx.currentTime + startTime + config.duration / 1000,
        );
      } else {
        gainNode.gain.setValueAtTime(config.gain, ctx.currentTime + startTime);
        gainNode.gain.setValueAtTime(
          0,
          ctx.currentTime + startTime + config.duration / 1000,
        );
      }

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime + startTime);
      oscillator.stop(ctx.currentTime + startTime + config.duration / 1000);
    },
    [isMuted, initAudioContext],
  );

  // Play a sound effect
  const playSound = useCallback(
    (sound: SoundType) => {
      if (isMuted) return;

      const config = SOUND_CONFIGS[sound];

      if (Array.isArray(config)) {
        let delay = 0;
        config.forEach((tone) => {
          playTone(tone, delay);
          delay += tone.duration / 1000;
        });
      } else {
        playTone(config);
      }
    },
    [isMuted, playTone],
  );

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
    // Initialize audio context when unmuting
    if (isMuted) {
      initAudioContext();
    }
  }, [isMuted, initAudioContext]);

  // Load mute preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("soundMuted");
    if (stored !== null) {
      setIsMuted(stored === "true");
    }
  }, []);

  // Save mute preference
  useEffect(() => {
    localStorage.setItem("soundMuted", String(isMuted));
  }, [isMuted]);

  return {
    isMuted,
    toggleMute,
    playSound,
    initAudioContext,
  };
};

export default useSoundEffects;
