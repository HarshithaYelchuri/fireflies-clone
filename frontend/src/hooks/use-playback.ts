"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;

export interface Playback {
  currentTime: number;
  duration: number;
  playing: boolean;
  rate: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  /** Jump to `time` seconds (clamped to the meeting length). */
  seek: (time: number) => void;
  skip: (delta: number) => void;
  setRate: (rate: number) => void;
}

/**
 * Playback clock for the meeting player. Recordings are out of scope, so this is a simulated
 * media element: a requestAnimationFrame clock that advances at the chosen speed. It exposes the
 * same surface a real <audio>/<video> would (time, play/pause, seek, rate), so the transcript
 * sync logic doesn't care which one drives it.
 */
export function usePlayback(duration: number): Playback {
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const timeRef = useRef(0);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const next = Math.min(duration, timeRef.current + ((now - last) / 1000) * rate);
      last = now;
      timeRef.current = next;
      setCurrentTime(next);
      if (next >= duration) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, rate, duration]);

  const seek = useCallback(
    (time: number) => {
      const next = Math.min(Math.max(0, time), duration);
      timeRef.current = next;
      setCurrentTime(next);
    },
    [duration],
  );

  const play = useCallback(() => {
    if (timeRef.current >= duration) seek(0);
    setPlaying(duration > 0);
  }, [duration, seek]);

  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);
  const skip = useCallback((delta: number) => seek(timeRef.current + delta), [seek]);

  return { currentTime, duration, playing, rate, play, pause, toggle, seek, skip, setRate };
}
