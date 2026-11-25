import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuthorFilters, FlagKey } from "@/hooks/use-author-filters";
import {
  DOWNLOAD_BUTTONS,
  LINK_BUTTONS,
  iconFor,
  type SortOption,
} from "@/lib/authors";
import { Fragment } from "react";

const FLAG_BUTTONS: { key: FlagKey; label: string }[] = [
  { key: "favorites", label: "⭐ Favorites" },
  { key: "recommended", label: "👑 Recommended" },
  { key: "scenes", label: "🎬 Makes scenes" },
  { key: "archive", label: "🧲 In scene archive" },
  { key: "telegram", label: "#️⃣ Telegram tag" },
];

/** A row of toggle buttons ("Has link:", "Has download:", "Show only:"). */
function FilterButtonRow<K extends string>({
  heading,
  options,
  selected,
  onToggle,
  getIcon,
  children,
}: {
  heading: string;
  options: { key: K; label: string }[];
  selected: K[];
  onToggle: (key: K) => void;
  /** Optional: returns an icon URL to show before each option's label. */
  getIcon?: (key: K) => string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">{heading}</span>
      {options.map(({ key, label }) => (
        <Button
          key={key}
          type="button"
          size="sm"
          variant={selected.includes(key) ? "default" : "outline"}
          aria-pressed={selected.includes(key)}
          onClick={() => onToggle(key)}
        >
          {getIcon && (
            <img
              src={getIcon(key)}
              alt=""
              loading="lazy"
              className="size-4 rounded-sm"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          )}
          {label}
        </Button>
      ))}
      {children}
    </div>
  );
}

export function AuthorFilters({
  filters,
  loading,
  totalCount,
}: {
  filters: AuthorFilters;
  loading: boolean;
  totalCount: number;
}) {
  const seriesAnchor = useComboboxAnchor();
  const {
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
    toggleLinkMode,
    visibleAuthors,
    hasActiveFilters,
    clearFilters,
  } = filters;

  return (
    <div className="flex flex-col gap-4 w-full max-w-3xl mx-auto">
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
                  placeholder={values.length === 0 ? "Filter by series..." : ""}
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

      <FilterButtonRow
        heading="Show only:"
        options={FLAG_BUTTONS}
        selected={FLAG_BUTTONS.filter(({ key }) => flags[key]).map((f) => f.key)}
        onToggle={(key) => setFlag(key, !flags[key])}
      />

      <FilterButtonRow
        heading="Has link:"
        options={LINK_BUTTONS}
        selected={linkFilters}
        onToggle={toggleLinkFilter}
        getIcon={iconFor}
      />
      <FilterButtonRow
        heading="Has download:"
        options={DOWNLOAD_BUTTONS}
        selected={linkFilters}
        onToggle={toggleLinkFilter}
        getIcon={iconFor}
      >
        {linkFilters.length > 1 && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={toggleLinkMode}
            title="Toggle between matching any or all selected links"
          >
            Match: {linkMode === "any" ? "any (OR)" : "all (AND)"}
          </Button>
        )}
      </FilterButtonRow>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {loading ? "" : `${visibleAuthors.length} of ${totalCount} authors`}
        </span>
        {hasActiveFilters && (
          <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}