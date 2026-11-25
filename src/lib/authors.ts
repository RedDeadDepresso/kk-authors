export interface DownloadLinks {
  mega: string;
  drive: string;
  buzzheavier: string;
  fileditch: string;
}

export interface Links {
  pixiv: string;
  download: DownloadLinks;
  pawchive: string;
  bepis: string;
  koikatsucards: string;
}

export interface Author {
  name: string;
  alias: string[];
  series: string[];
  isRecommended: boolean;
  makesScenes: boolean;
  inSceneArchive: boolean;
  favorited: number;
  telegram: string[];
  icon: string;
  banner: string;
  links: Links;
}

export type SortOption = "name" | "-name" | "favorited" | "-favorited";

export const AUTHORS_URL =
  "https://reddeaddepresso.github.io/kk-author-scraper/indices/author_detailed.json";

export const PAGE_SIZE = 60;

export type LinkKey = Exclude<keyof Links, "download">;
export type DownloadKey = keyof DownloadLinks;
/** Anything the "Has link / Has download" filters can select. */
export type FilterKey = LinkKey | DownloadKey;
export type ButtonKey = LinkKey | "kknow" | "telegram" | "scenes";

// Icon files live in public/icons/<key>.png
export const LINK_BUTTONS: { key: LinkKey; label: string }[] = [
  { key: "pixiv", label: "Pixiv" },
  { key: "koikatsucards", label: "KoikatsuCards" },
  { key: "bepis", label: "Bepis" },
  { key: "pawchive", label: "Pawchive" },
];

// Download hosts, in display order
export const DOWNLOAD_BUTTONS: { key: DownloadKey; label: string }[] = [
  { key: "mega", label: "Mega" },
  { key: "drive", label: "Google Drive" },
  { key: "buzzheavier", label: "Buzzheavier" },
  { key: "fileditch", label: "Fileditch" },
];

const DOWNLOAD_KEYS = new Set<string>(DOWNLOAD_BUTTONS.map((d) => d.key));

export function isValidUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/** Whether the author has a valid link (or download host link) for `key`. */
export function hasLink(author: Author, key: FilterKey): boolean {
  return DOWNLOAD_KEYS.has(key)
    ? isValidUrl(author.links?.download?.[key as DownloadKey])
    : isValidUrl(author.links?.[key as LinkKey]);
}

// kknow.cc is a XenForo forum. /search/<id>/ URLs are one-off results that the
// server generates after a search is submitted, so they can't be built by hand.
// /search/search/ is the endpoint that actually runs a new search from a URL.
const KKNOW_SEARCH_URL = "https://kknow.cc/search/search/";

// Always available: search KKnow for the author's name, newest first
export function kknowUrlFor(name: string): string {
  return `${KKNOW_SEARCH_URL}?keywords=${encodeURIComponent(name)}&order=date`;
}

// Telegram Web can't be searched through a URL. The button opens Telegram Web and
// carries the author name in data-kkafio-telegram: the KKAFIO Link Collector
// extension picks that up on click and types the name into Telegram's search box.
// Without the extension it just opens Telegram Web.
export const TELEGRAM_URL = "https://web.telegram.org/k/";

// Normalizes the optional `telegram` field: trimmed, non-empty, unique tags.
export function telegramTags(value: string[]): string[] {
  return [...new Set((value ?? []).map((t) => t.trim()).filter(Boolean))];
}

// Pepper's Scene Archive torrent, shown for authors with inSceneArchive = true
export const SCENES_MAGNET_URL =
  "magnet:?xt=urn:btih:9c8e8b96c3c55322b15310f37dd80cb40f5d274d&dn=Pepper%27s_Scene_Archive&xl=793193494300";

export function iconFor(key: ButtonKey | DownloadKey): string {
  return `${import.meta.env.BASE_URL}icons/${key}.png`;
}

/** Tailwind color classes for the flag icons, shared by the filters and the author cards. */
export const FLAG_ICON_CLASS = {
  favorites: "text-yellow-400 fill-yellow-400",
  recommended: "text-amber-500 fill-amber-500",
  scenes: "text-purple-300",
  archive: "",
  telegram: "text-sky-500",
} as const;