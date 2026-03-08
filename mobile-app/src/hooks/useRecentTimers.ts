import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'aria_recent_timers';
const MAX_RECENTS = 8;

export interface RecentTimer {
  /** Total duration in seconds */
  seconds: number;
  /** Display label e.g. "5:00" or "1:30:00" */
  label: string;
  /** Timestamp of last use */
  usedAt: number;
}

function formatTimerLabel(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  if (m > 0 && s > 0) return `${m}:${s.toString().padStart(2, '0')}`;
  if (m > 0) return `${m} min`;
  return `${s}s`;
}

export function useRecentTimers() {
  const [recents, setRecents] = useState<RecentTimer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const recentsRef = useRef<RecentTimer[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as RecentTimer[];
          recentsRef.current = parsed;
          setRecents(parsed);
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const addRecent = useCallback((totalSeconds: number) => {
    if (totalSeconds <= 0) return;

    const existing = recentsRef.current;
    // Remove duplicate if same duration exists
    const filtered = existing.filter((r) => r.seconds !== totalSeconds);
    const entry: RecentTimer = {
      seconds: totalSeconds,
      label: formatTimerLabel(totalSeconds),
      usedAt: Date.now(),
    };
    const updated = [entry, ...filtered].slice(0, MAX_RECENTS);
    recentsRef.current = updated;
    setRecents(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  return { recents, loaded, addRecent };
}
