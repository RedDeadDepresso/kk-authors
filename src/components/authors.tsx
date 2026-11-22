import { cn } from "@/lib/utils";
import { Download, Magnet, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useFavorites } from "@/hooks/use-favorites";
import {
  Fragment,
  memo,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface Links {
  pixiv: string;
  download: string;
  pawchive: string;
  bepis: string;
  koikatsucards: string;
}

interface Author {
  name: string;
  alias: string[];
  series: string[];
  isRecommended: boolean;
  makesScenes: boolean;
  favorited: number;
  telegram: string[];
  icon: string;
  banner: string;
  links: Links;
}

type SortOption = "name" | "-name" | "favorited" | "-favorited";

const AUTHORS_URL =
  "https://reddeaddepresso.github.io/kk-author-scraper/indices/author.json";

const PAGE_SIZE = 60;

type LinkKey = keyof Links;

// "icon" files live in public/icons/<key>.png; download uses a lucide icon
const LINK_BUTTONS: { key: LinkKey; label: string }[] = [
  { key: "pixiv", label: "Pixiv" },
  { key: "koikatsucards", label: "KoikatsuCards" },
  { key: "bepis", label: "Bepis" },
  { key: "pawchive", label: "Pawchive" },
];

function isValidUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// kknow.cc is a XenForo forum. /search/<id>/ URLs are one-off results that the
// server generates after a search is submitted, so they can't be built by hand.
// /search/search/ is the endpoint that actually runs a new search from a URL.
const KKNOW_SEARCH_URL = "https://kknow.cc/search/search/";

// Always available: search KKnow for the author's name, newest first
function kknowUrlFor(name: string): string {
  return `${KKNOW_SEARCH_URL}?keywords=${encodeURIComponent(name)}&order=date`;
}

// Telegram Web can't be searched through a URL. The button opens Telegram Web and
// carries the author name in data-kkafio-telegram: the KKAFIO Link Collector
// extension picks that up on click and types the name into Telegram's search box.
// Without the extension it just opens Telegram Web.
const TELEGRAM_URL = "https://web.telegram.org/k/";

// Normalizes the optional `telegram` field: trimmed, non-empty, unique tags.
function telegramTags(value: string[]): string[] {
  return [...new Set((value ?? []).map((t) => t.trim()).filter(Boolean))];
}

// Pepper's Scene Archive torrent, shown for authors with makesScenes = true
const SCENES_MAGNET_URL =
  "magnet:?xt=urn:btih:9c8e8b96c3c55322b15310f37dd80cb40f5d274d&dn=Pepper%27s_Scene_Archive&xl=793193494300";

type ButtonKey = LinkKey | "kknow" | "telegram" | "scenes";

function iconFor(key: ButtonKey): string {
  return `${import.meta.env.BASE_URL}icons/${key}.png`;
}

function LinkButton({
  linkKey,
  href,
  label,
  author,
  telegramQuery,
  title,
  badge,
}: {
  linkKey: ButtonKey;
  href: string;
  label: string;
  author: string;
  telegramQuery?: string;
  title?: string;
  badge?: string; // small marker on the icon, to tell two buttons with the same icon apart
}) {
  const [iconFailed, setIconFailed] = useState(false);
  const isMagnet = href.startsWith("magnet:");
  const useLucide =
    linkKey === "download" || linkKey === "scenes" || iconFailed;

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      className="relative"
      title={title ?? `${author} on ${label}`}
    >
      <a
        href={href}
        {...(isMagnet ? {} : { target: "_blank", rel: "noopener noreferrer" })}
        aria-label={`${author} on ${label}`}
        {...(telegramQuery ? { "data-kkafio-telegram": telegramQuery } : {})}
      >
        {useLucide ? (
          linkKey === "download" ? (
            <Download />
          ) : linkKey === "scenes" ? (
            <Magnet />
          ) : (
            <span className="text-xs font-bold">{label.charAt(0)}</span>
          )
        ) : (
          <img
            src={iconFor(linkKey)}
            alt=""
            loading="lazy"
            className="size-5 rounded-sm"
            onError={() => setIconFailed(true)}
          />
        )}
        {badge && (
          <span className="absolute -top-0.5 -right-0.5 rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">
            {badge}
          </span>
        )}
      </a>
    </Button>
  );
}

// Several Telegram tags: one button with a menu, one entry per tag.
function TelegramTagsMenu({ author, tags }: { author: string; tags: string[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          title={`${tags.length} Telegram tags`}
          aria-label={`${author} Telegram tags`}
        >
          <img src={iconFor("telegram")} alt="" className="size-5 rounded-sm" />
          <span className="absolute -top-0.5 -right-0.5 rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">
            #{tags.length}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Search on Telegram</DropdownMenuLabel>
        {tags.map((tag) => (
          <DropdownMenuItem key={tag} asChild>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-kkafio-telegram={tag}
            >
              {tag}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Memoized so unchanged cards don't re-render; banner is a real lazy <img>
const AuthorCard = memo(function AuthorCard({
  name,
  isRecommended,
  favorited,
  telegram,
  icon,
  banner,
  links,
  makesScenes,
  isFavorite,
  onToggleFavorite,
}: {
  isFavorite: boolean;
  onToggleFavorite: (name: string) => void;
} & Pick<
  Author,
  | "name"
  | "isRecommended"
  | "favorited"
  | "telegram"
  | "icon"
  | "banner"
  | "links"
  | "makesScenes"
>) {
  const available = LINK_BUTTONS.filter(({ key }) => isValidUrl(links?.[key]));
  const tags = telegramTags(telegram).filter((t) => t !== name);
  return (
    <Card
      className={cn(
        "relative overflow-hidden text-white",
        isFavorite && "border-yellow-400 ring-1 ring-yellow-400",
      )}
    >
      <img
        src={banner}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-linear-to-b from-black/50 to-black/80" />
      <CardContent className="relative flex gap-4 items-center">
        <Avatar className="size-20">
          <AvatarImage src={icon} loading="lazy" />
          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <CardTitle className="font-bold text-lg">
            {name}
            {isRecommended && " 👑"}
            {makesScenes && " 🎬"}
          </CardTitle>
          {favorited !== undefined && (
            <span>
              <span className="font-bold">{favorited}</span> favorites
            </span>
          )}
          {tags.length > 0 && (
            <span className="text-sm text-white/80">
              Telegram: {tags.join(", ")}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="dark ml-auto"
          aria-pressed={isFavorite}
          aria-label={
            isFavorite
              ? `Remove ${name} from favorites`
              : `Add ${name} to favorites`
          }
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          onClick={() => onToggleFavorite(name)}
        >
          <Star
            className={cn(isFavorite && "fill-yellow-400 text-yellow-400")}
          />
        </Button>
      </CardContent>
      <CardFooter className="relative flex items-end gap-2 h-full">
        {available.map(({ key, label }) => (
          <LinkButton
            key={key}
            linkKey={key}
            href={links[key]}
            label={label}
            author={name}
          />
        ))}
        <LinkButton
          linkKey="kknow"
          href={kknowUrlFor(name)}
          label="KKnow"
          author={name}
        />
        <LinkButton
          linkKey="telegram"
          href={TELEGRAM_URL}
          label="Telegram"
          author={name}
          telegramQuery={name}
          title={`Search ${name} on Telegram`}
        />
        {tags.length === 1 && (
          <LinkButton
            linkKey="telegram"
            href={TELEGRAM_URL}
            label="Telegram"
            author={name}
            telegramQuery={tags[0]}
            title={`Search ${tags[0]} on Telegram`}
            badge="#"
          />
        )}
        {tags.length > 1 && <TelegramTagsMenu author={name} tags={tags} />}
        {makesScenes && (
          <LinkButton
            linkKey="scenes"
            href={SCENES_MAGNET_URL}
            label="Pepper's Scene Archive (magnet)"
            author={name}
          />
        )}
        {links.download && (
          <LinkButton
            linkKey="download"
            href={links.download}
            label="Download"
            author={name}
          />
        )}
      </CardFooter>
    </Card>
  );
});

export function Authors() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [recommendedChecked, setRecommendedChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("favorited");
  const { favorites, toggleFavorite } = useFavorites();
  const [favoritesChecked, setFavoritesChecked] = useState(false);
  const [scenesChecked, setScenesChecked] = useState(false);
  const [telegramChecked, setTelegramChecked] = useState(false);
  const [series, setSeries] = useState<string[]>([]);
  const seriesAnchor = useComboboxAnchor();
  const [linkFilters, setLinkFilters] = useState<LinkKey[]>([]);
  const [linkMode, setLinkMode] = useState<"any" | "all">("any");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    async function fetchAuthors() {
      try {
        setLoading(true);
        const response = await fetch(AUTHORS_URL);
        if (!response.ok) {
          throw new Error(`Response status: ${response.status}`);
        }
        setAuthors(await response.json());
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "An unknown error occurred.",
        );
      } finally {
        setLoading(false);
      }
    }
    fetchAuthors();
  }, []);

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
  const favoritesOnly = favoritesChecked ? favorites : null;

  const visibleAuthors = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    const selectedSeries = new Set(series);
    const favoriteSet = favoritesOnly;
    return authors
      .filter((a) => {
        if (recommendedChecked && !a.isRecommended) return false;
        if (scenesChecked && !a.makesScenes) return false;
        if (telegramChecked && telegramTags(a.telegram).length === 0)
          return false;
        if (favoriteSet && !favoriteSet.has(a.name)) return false;
        if (
          selectedSeries.size > 0 &&
          !a.series?.some((name) => selectedSeries.has(name))
        )
          return false;
        if (linkFilters.length > 0) {
          const has = (key: LinkKey) => isValidUrl(a.links?.[key]);
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
    recommendedChecked,
    scenesChecked,
    telegramChecked,
    favoritesOnly,
    series,
    linkFilters,
    linkMode,
    deferredSearch,
    sortBy,
  ]);

  const hasActiveFilters =
    recommendedChecked ||
    scenesChecked ||
    telegramChecked ||
    favoritesChecked ||
    series.length > 0 ||
    linkFilters.length > 0;

  function clearFilters() {
    setRecommendedChecked(false);
    setScenesChecked(false);
    setTelegramChecked(false);
    setFavoritesChecked(false);
    setSeries([]);
    setLinkFilters([]);
    setLinkMode("any");
  }

  function toggleLinkFilter(key: LinkKey) {
    setLinkFilters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  // Reset the slice whenever the filter/sort changes
  useEffect(() => setLimit(PAGE_SIZE), [visibleAuthors]);

  // Infinite scroll: grow the slice when the sentinel nears the viewport
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
  }, [visibleAuthors, limit]);

  const shown = visibleAuthors.slice(0, limit);

  return (
    <section className="space-y-8">
      <h2 className="text-3xl lg:text-4xl font-bold text-center">Authors</h2>
      <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
        <div className="flex items-center gap-4">
          <Input
            type="search"
            placeholder="Search by name or alias..."
            aria-label="Search authors by name or alias"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as SortOption)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">A-Z</SelectItem>
              <SelectItem value="-name">Z-A</SelectItem>
              <SelectItem value="favorited">Most Popular</SelectItem>
              <SelectItem value="-favorited">Least Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Combobox
          multiple
          autoHighlight
          items={seriesOptions}
          value={series}
          onValueChange={(value) => setSeries(value)}
        >
          <ComboboxChips ref={seriesAnchor} className="w-full">
            <ComboboxValue>
              {(values: string[]) => (
                <Fragment>
                  {values.map((value) => (
                    <ComboboxChip key={value}>{value}</ComboboxChip>
                  ))}
                  <ComboboxChipsInput
                    placeholder={
                      values.length === 0 ? "Filter by series..." : ""
                    }
                    aria-label="Filter by series"
                  />
                </Fragment>
              )}
            </ComboboxValue>
          </ComboboxChips>
          <ComboboxContent anchor={seriesAnchor}>
            <ComboboxEmpty>No series found.</ComboboxEmpty>
            <ComboboxList>
              {(item: string) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Has link:</span>
          {LINK_BUTTONS.map(({ key, label }) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={linkFilters.includes(key) ? "default" : "outline"}
              aria-pressed={linkFilters.includes(key)}
              onClick={() => toggleLinkFilter(key)}
            >
              {label}
            </Button>
          ))}
          {linkFilters.length > 1 && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setLinkMode((m) => (m === "any" ? "all" : "any"))}
              title="Toggle between matching any or all selected links"
            >
              Match: {linkMode === "any" ? "any (OR)" : "all (AND)"}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <Checkbox
              id="recommended-checkbox"
              checked={recommendedChecked}
              onCheckedChange={(value) => setRecommendedChecked(value === true)}
              className="size-6"
            />
            <label htmlFor="recommended-checkbox" className="text-lg">
              👑 Recommended
            </label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              id="scenes-checkbox"
              checked={scenesChecked}
              onCheckedChange={(value) => setScenesChecked(value === true)}
              className="size-6"
            />
            <label htmlFor="scenes-checkbox" className="text-lg">
              🎬 Makes scenes
            </label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              id="telegram-checkbox"
              checked={telegramChecked}
              onCheckedChange={(value) => setTelegramChecked(value === true)}
              className="size-6"
            />
            <label htmlFor="telegram-checkbox" className="text-lg">
              ✈️ Telegram tag
            </label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              id="favorites-checkbox"
              checked={favoritesChecked}
              onCheckedChange={(value) => setFavoritesChecked(value === true)}
              className="size-6"
            />
            <label htmlFor="favorites-checkbox" className="text-lg">
              ⭐ Favorites
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {loading
              ? ""
              : `${visibleAuthors.length} of ${authors.length} authors`}
          </span>
          {hasActiveFilters && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading && <Spinner />}
        {errorMessage && <p className="text-xl text-red-500">{errorMessage}</p>}
        {!loading && !errorMessage && visibleAuthors.length === 0 && (
          <p className="text-lg col-span-full text-center">
            No authors match your search or filters.
          </p>
        )}
        {!errorMessage &&
          shown.map((a) => (
            <AuthorCard
              key={a.name}
              {...a}
              isFavorite={favorites.has(a.name)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
      </div>

      {shown.length < visibleAuthors.length && (
        <div ref={sentinelRef} className="h-10" />
      )}
    </section>
  );
}
