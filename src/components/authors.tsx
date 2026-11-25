import { AuthorCard } from "@/components/author-card";
import { AuthorFilters } from "@/components/author-filters";
import { BackToTop } from "@/components/back-to-top";
import { Spinner } from "@/components/ui/spinner";
import { useAuthorFilters } from "@/hooks/use-author-filters";
import { useAuthors } from "@/hooks/use-authors";
import { useFavorites } from "@/hooks/use-favorites";
import { useInfiniteList } from "@/hooks/use-infinite-list";

export function Authors() {
  const { authors, loading, error } = useAuthors();
  const { favorites, toggleFavorite } = useFavorites();
  const filters = useAuthorFilters(authors, favorites);
  const { visibleAuthors } = filters;
  const { shown, hasMore, sentinelRef } = useInfiniteList(visibleAuthors);

  return (
    <section className="space-y-8">
      <h2 className="text-3xl lg:text-4xl font-bold text-center">Authors</h2>
      <AuthorFilters
        filters={filters}
        loading={loading}
        totalCount={authors.length}
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading && (
          <div className="col-span-full flex justify-center py-24">
            <Spinner className="size-16" />
          </div>
        )}
        {error && <p className="text-xl text-red-500">{error}</p>}
        {!loading && !error && visibleAuthors.length === 0 && (
          <p className="text-lg col-span-full text-center">
            No authors match your search or filters.
          </p>
        )}
        {!error &&
          shown.map((a) => (
            <AuthorCard
              key={a.name}
              {...a}
              isFavorite={favorites.has(a.name)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
      </div>

      {hasMore && <div ref={sentinelRef} className="h-10" />}

      <BackToTop />
    </section>
  );
}
