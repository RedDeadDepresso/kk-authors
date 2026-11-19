import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "kk-authors:favorites";

function readFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((v): v is string => typeof v === "string")
        : [],
    );
  } catch {
    // localStorage unavailable (private mode, blocked) or corrupt JSON
    return new Set();
  }
}

/** Favorite author names, persisted in localStorage and synced across tabs. */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(readFavorites);

  const toggleFavorite = useCallback((name: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  // Persist whenever the set changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
    } catch {
      // ignore write failures (quota exceeded / storage disabled)
    }
  }, [favorites]);

  // Keep other open tabs in sync
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setFavorites(readFavorites());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { favorites, toggleFavorite };
}
