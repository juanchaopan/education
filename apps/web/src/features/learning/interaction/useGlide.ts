import { useEffect, useRef, useState } from 'react';

type Glide = Readonly<{
  // How fast the value shown moves towards a new value, in units a second.
  rate: number;
  // The child holds what moves, so it follows the finger without delay.
  held?: boolean;
}>;

const stillPreferred = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// A value as a scene shows it while it moves to a new one, such as two cars
// driving on to the next second: the value shown travels to the new value
// at a steady rate, so everything drawn from it changes one step at a time
// on the way. It takes the new value at once while the child holds what
// moves, and whenever the device asks for less motion. A scene drawn for the
// first time shows its value as it is.
export function useGlide(value: number, { rate, held = false }: Glide) {
  const [shown, setShown] = useState(value);
  const still = held || stillPreferred();
  if (still && shown !== value) setShown(value);
  // The value on the last frame drawn, where a new glide sets off from.
  const drawn = useRef(shown);
  useEffect(() => {
    drawn.current = shown;
  });
  useEffect(() => {
    const begin = drawn.current;
    if (still || begin === value) return;
    const started = performance.now();
    const lasts = (Math.abs(value - begin) / rate) * 1000;
    let frame = requestAnimationFrame(function step(now) {
      const done = Math.min(1, Math.max(0, now - started) / lasts);
      setShown(begin + (value - begin) * done);
      if (done < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, still, rate]);
  return shown;
}
