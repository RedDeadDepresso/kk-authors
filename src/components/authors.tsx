import { Download, Magnet } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
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
  makeScenes: boolean;
  favorited: number;
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
  { key: "bepis", label: "Bepis" },
  { key: "koikatsucards", label: "KoikatsuCards" },
  { key: "pawchive", label: "Pawchive" },
  { key: "download", label: "Download" },
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

// Pepper's Scene Archive torrent, shown for authors with makeScenes = true
const SCENES_MAGNET_URL =
  "magnet:?xt=urn:btih:9c8e8b96c3c55322b15310f37dd80cb40f5d274d&dn=Pepper%27s_Scene_Archive&xl=793193494300";

type ButtonKey = LinkKey | "kknow" | "scenes";

function iconFor(key: ButtonKey): string {
  return `${import.meta.env.BASE_URL}icons/${key}.png`;
}

function LinkButton({
  linkKey,
  href,
  label,
  author,
}: {
  linkKey: ButtonKey;
  href: string;
  label: string;
  author: string;
}) {
  const [iconFailed, setIconFailed] = useState(false);
  const isMagnet = href.startsWith("magnet:");
  const useLucide = linkKey === "download" || linkKey === "scenes" || iconFailed;

  return (
    <Button
      asChild
      variant="secondary"
      size="icon"
      title={`${author} on ${label}`}
    >
      <a
        href={href}
        {...(isMagnet ? {} : { target: "_blank", rel: "noopener noreferrer" })}
        aria-label={`${author} on ${label}`}
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
      </a>
    </Button>
  );
}

// Memoized so unchanged cards don't re-render; banner is a real lazy <img>
const AuthorCard = memo(function AuthorCard({
  name,
  isRecommended,
  favorited,
  icon,
  banner,
  links,
  makeScenes,
}: Pick<
  Author,
  "name" | "isRecommended" | "favorited" | "icon" | "banner" | "links" | "makeScenes"
>) {
  const available = LINK_BUTTONS.filter(({ key }) =>
    isValidUrl(links?.[key]),
  );
  return (
    <Card className="relative overflow-hidden">
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
            {isRecommended ? `${name} 👑` : name}
          </CardTitle>
          {favorited !== undefined && (
            <span>
              <span className="font-bold">{favorited}</span> favorites
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter className="relative flex justify-end items-end gap-2 h-full">
        <LinkButton
          linkKey="kknow"
          href={kknowUrlFor(name)}
          label="KKnow"
          author={name}
        />
        {makeScenes && (
          <LinkButton
            linkKey="scenes"
            href={SCENES_MAGNET_URL}
            label="Pepper's Scene Archive (magnet)"
            author={name}
          />
        )}
          {available.map(({ key, label }) => (
            <LinkButton
              key={key}
              linkKey={key}
              href={links[key]}
              label={label}
              author={name}
            />
          ))}
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

  const visibleAuthors = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return authors
      .filter((c) => (recommendedChecked ? c.isRecommended : true))
      .filter((c) => c.name.toLowerCase().includes(query))
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
  }, [authors, recommendedChecked, deferredSearch, sortBy]);

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
      <div className="flex flex-col items-center justify-center gap-4 sm:w-lg mx-auto">
        <Input
          type="search"
          placeholder="Search for authors..."
          aria-label="Search authors by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full"
        />
        <div className="w-full flex items-center justify-between gap-4">
          <div className="flex items-center justify-center gap-4">
            <Checkbox
              id="terms-checkbox-basic"
              name="terms-checkbox-basic"
              checked={recommendedChecked}
              onCheckedChange={(value) => setRecommendedChecked(value === true)}
              className="size-6"
            />
            <label htmlFor="terms-checkbox-basic" className="text-lg">
              👑 Recommended
            </label>
          </div>
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
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading && <Spinner />}
        {errorMessage && <p className="text-xl text-red-500">{errorMessage}</p>}
        {!loading && !errorMessage && visibleAuthors.length === 0 && (
          <p className="text-lg col-span-full text-center">
            No authors match your search.
          </p>
        )}
        {!errorMessage &&
          shown.map((a) => <AuthorCard key={a.name} {...a} />)}
      </div>

      {shown.length < visibleAuthors.length && (
        <div ref={sentinelRef} className="h-10" />
      )}
    </section>
  );
}
