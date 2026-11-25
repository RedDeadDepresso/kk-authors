import { cn } from "@/lib/utils";
import { Download, Magnet, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DOWNLOAD_BUTTONS,
  LINK_BUTTONS,
  SCENES_MAGNET_URL,
  TELEGRAM_URL,
  iconFor,
  isValidUrl,
  kknowUrlFor,
  telegramTags,
  type Author,
  type ButtonKey,
  type DownloadKey,
} from "@/lib/authors";
import { memo, useState } from "react";

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
  const useLucide = linkKey === "scenes" || iconFailed;

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
          linkKey === "scenes" ? (
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

// One Download button. A single host opens its page directly; several hosts
// open a menu (like the Telegram tags), one entry per host.
function DownloadButton({
  author,
  downloads,
}: {
  author: string;
  downloads: { key: DownloadKey; label: string; href: string }[];
}) {
  if (downloads.length === 0) return null;

  if (downloads.length === 1) {
    const [{ label, href }] = downloads;
    return (
      <Button
        asChild
        variant="ghost"
        size="icon"
        title={`Download ${author} from ${label}`}
      >
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Download ${author} from ${label}`}
        >
          <Download />
        </a>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          title={`${downloads.length} download links`}
          aria-label={`Download ${author}`}
        >
          <Download />
          <span className="absolute -top-0.5 -right-0.5 rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">
            {downloads.length}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Download</DropdownMenuLabel>
        {downloads.map(({ key, label, href }) => (
          <DropdownMenuItem key={key} asChild>
            <a href={href} target="_blank" rel="noopener noreferrer">
              <img
                src={iconFor(key)}
                alt=""
                className="size-4 rounded-sm"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              {label}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Memoized so unchanged cards don't re-render; banner is a real lazy <img>
export const AuthorCard = memo(function AuthorCard({
  name,
  isRecommended,
  favorited,
  telegram,
  icon,
  banner,
  links,
  makesScenes,
  inSceneArchive,
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
  | "inSceneArchive"
>) {
  const available = LINK_BUTTONS.filter(({ key }) => isValidUrl(links?.[key]));
  const downloads = DOWNLOAD_BUTTONS.flatMap(({ key, label }) => {
    const href = links?.download?.[key];
    return isValidUrl(href) ? [{ key, label, href }] : [];
  });
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
        {inSceneArchive && (
          <LinkButton
            linkKey="scenes"
            href={SCENES_MAGNET_URL}
            label="Pepper's Scene Archive (magnet)"
            author={name}
          />
        )}
        <DownloadButton author={name} downloads={downloads} />
      </CardFooter>
    </Card>
  );
});
