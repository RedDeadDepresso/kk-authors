import { PAGE_SIZE } from "@/lib/authors";
import { useEffect, useRef, useState } from "react";

/**
 * Infinite scroll over an in-memory list: grows the visible slice when the
 * sentinel element nears the viewport, and resets whenever `items` changes.
 */
export function useInfiniteList<T>(items: T[]) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset the slice whenever the filter/sort changes
  useEffect(() => setLimit(PAGE_SIZE), [items]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setLimit((l) => l + PAGE_SIZE);
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [items, limit]);

  const shown = items.slice(0, limit);
  return { shown, hasMore: shown.length < items.length, sentinelRef };
}
