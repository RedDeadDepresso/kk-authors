import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useEffect, useState } from "react";

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

export function Authors() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [recommendedChecked, setRecommendedChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("favorited");
  const [search, setSearch] = useState("");

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

  // filter() returns a new array, so sort() doesn't mutate state
  const query = search.trim().toLowerCase();
  const visibleAuthors = authors
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
          visibleAuthors.map(
            ({ name, isRecommended, favorited, icon, banner }) => (
              <Card
                key={name}
                className="bg-cover bg-center relative overflow-hidden"
                style={{
                  backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.8)),url(${banner})`,
                }}
              >
                <CardContent className="flex gap-4 items-center">
                  <Avatar className="size-20">
                    <AvatarImage src={icon} />
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
                <CardFooter className="flex justify-end items-end gap-4 h-full"></CardFooter>
              </Card>
            ),
          )}
      </div>
    </section>
  );
}
