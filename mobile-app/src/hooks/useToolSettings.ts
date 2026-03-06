import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useToolSettings<T extends object>(
  storageKey: string,
  defaults: T,
) {
  const [settings, setSettings] = useState<T>(defaults);
  const [loaded, setLoaded] = useState(false);
  const defaultsRef = useRef(defaults);

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((raw) => {
      if (raw) {
        try {
          const stored = JSON.parse(raw) as Partial<T>;
          setSettings({ ...defaultsRef.current, ...stored });
        } catch {
          setSettings(defaultsRef.current);
        }
      }
      setLoaded(true);
    });
  }, [storageKey]);

  const update = useCallback(
    (patch: Partial<T>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        AsyncStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    },
    [storageKey],
  );

  const reset = useCallback(() => {
    setSettings(defaultsRef.current);
    AsyncStorage.setItem(storageKey, JSON.stringify(defaultsRef.current));
  }, [storageKey]);

  return { settings, loaded, update, reset };
}
