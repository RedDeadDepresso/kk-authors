import { AUTHORS_URL, type Author } from "@/lib/authors";
import { useEffect, useState } from "react";

/** Loads the author index once on mount. */
export function useAuthors() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAuthors() {
      try {
        setLoading(true);
        const response = await fetch(AUTHORS_URL);
        if (!response.ok) {
          throw new Error(`Response status: ${response.status}`);
        }
        setAuthors(await response.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "An unknown error occurred.");
      } finally {
        setLoading(false);
      }
    }
    fetchAuthors();
  }, []);

  return { authors, loading, error };
}
