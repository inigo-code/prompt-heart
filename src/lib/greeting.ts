import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Time-of-day welcome, e.g. "Good evening, Inigo!"; late at night it's "Still up, Inigo?". */
export function greeting(hour: number, name: string): string {
  const who = name.trim();
  if (hour >= 5 && hour < 12) return who ? `Good morning, ${who}!` : 'Good morning!';
  if (hour >= 12 && hour < 17) return who ? `Good afternoon, ${who}!` : 'Good afternoon!';
  if (hour >= 17 && hour < 22) return who ? `Good evening, ${who}!` : 'Good evening!';
  return who ? `Still up, ${who}?` : 'Still up?';
}

/** The current hour, kept fresh while the app is open and whenever it comes back to the foreground. */
export function useHour(): number {
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const tick = () => setHour(new Date().getHours());
    const timer = setInterval(tick, 60_000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && tick());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  return hour;
}
