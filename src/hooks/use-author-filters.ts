import {
  hasLink,
  telegramTags,
  type Author,
  type FilterKey,
  type SortOption,
} from "@/lib/authors";
import { useDeferredValue, useMemo, useState } from "react";

export type FlagKey =
  | "recommended"
  | "scenes"
  | "archive"
  | "telegram"
  | "favorites";

const NO_FLAGS: Record<FlagKey, boolean> = {
  recommended: false,
  scenes: false,
  archive: false,
  telegram: false,
  favorites: false,
};

/** Search, sort and filter state for the author list, plus the filtered result. */
export function useAuthorFilters(authors: Author[], favorites: Set<string>) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("favorited");
  const [flags, setFlags] = useState(NO_FLAGS);
  const [series, setSeries] = useState<string[]>([]);
  const [linkFilters, setLinkFilters] = useState<FilterKey[]>([]);
  const [linkMode, setLinkMode] = useState<"any" | "all">("any");
  const deferredSearch = useDeferredValue(search);

  // All distinct series names for the series filter
  const seriesOptions = useMemo(() => {
    const names = new Set<string>();
    for (const a of authors) {
      for (const name of a.series ?? []) {
        if (name) names.add(name);
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [authors]);

  // Only depend on favorites while the filter is on, so starring a card
  // doesn't re-filter the list or reset how far the user has scrolled.
  const favoritesOnly = flags.favorites ? favorites : null;

  const visibleAuthors = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    const selectedSeries = new Set(series);
    return authors
      .filter((a) => {
        if (flags.recommended && !a.isRecommended) return false;
        if (flags.scenes && !a.makesScenes) return false;
        if (flags.archive && !a.inSceneArchive) return false;
        if (flags.telegram && telegramTags(a.telegram).length === 0)
          return false;
        if (favoritesOnly && !favoritesOnly.has(a.name)) return false;
        if (
          selectedSeries.size > 0 &&
          !a.series?.some((name) => selectedSeries.has(name))
        )
          return false;
        if (linkFilters.length > 0) {
          const has = (key: FilterKey) => hasLink(a, key);
          const ok =
            linkMode === "all" ? linkFilters.every(has) : linkFilters.some(has);
          if (!ok) return false;
        }
        return (
          a.name.toLowerCase().includes(query) ||
          (a.alias ?? []).some((alias) => alias.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "name":
            return a.name.localeCompare(b.name);
          case "-name":
            return b.name.localeCompare(a.name);
          case "favorited":
            return (b.favorited ?? 0) - (a.favorited ?? 0);
          case "-favorited":
            return (a.favorited ?? 0) - (b.favorited ?? 0);
        }
      });
  }, [
    authors,
    flags,
    favoritesOnly,
    series,
    linkFilters,
    linkMode,
    deferredSearch,
    sortBy,
  ]);

  const hasActiveFilters =
    Object.values(flags).some(Boolean) ||
    series.length > 0 ||
    linkFilters.length > 0;

  function setFlag(key: FlagKey, value: boolean) {
    setFlags((prev) => ({ ...prev, [key]: value }));
  }

  function toggleLinkFilter(key: FilterKey) {
    setLinkFilters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function clearFilters() {
    setFlags(NO_FLAGS);
    setSeries([]);
    setLinkFilters([]);
    setLinkMode("any");
  }

  return {
    search,
    setSearch,
    sortBy,
    setSortBy,
    flags,
    setFlag,
    series,
    setSeries,
    seriesOptions,
    linkFilters,
    toggleLinkFilter,
    linkMode,
    toggleLinkMode: () => setLinkMode((m) => (m === "any" ? "all" : "any")),
    visibleAuthors,
    hasActiveFilters,
    clearFilters,
  };
}

export type AuthorFilters = ReturnType<typeof useAuthorFilters>;
