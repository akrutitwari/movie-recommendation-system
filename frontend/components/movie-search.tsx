"use client";
import { useEffect, useRef, useState } from "react";
import { Search, Plus } from "lucide-react";
import { searchMovies } from "@/lib/api";
import type { Movie } from "@/types/movie";
export default function MovieSearch({
  selected,
  onSelect,
}: {
  selected: Movie[];
  onSelect: (movie: Movie) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!query.trim()) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const movies = await searchMovies(query.trim(), controller.signal);
        setResults(movies);
      } catch (err) {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "Search failed.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  const available = results.filter(
    (movie) => !selected.some((item) => item.id === movie.id),
  );
  function choose(movie: Movie) {
    onSelect(movie);
    setQuery("");
    setResults([]);
    setOpen(false);
    input.current?.focus();
  }
  return (
    <div
      className="search-wrapper"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label className="sr-only" htmlFor="movie-search">
        Search movies and series
      </label>
      <div className="search-field">
        <Search size={21} />
        <input
          ref={input}
          id="movie-search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && !!query.trim()}
          aria-controls="movie-options"
          aria-activedescendant={
            active >= 0 ? `movie-option-${active}` : undefined
          }
          autoComplete="off"
          maxLength={100}
          disabled={selected.length >= 5}
          placeholder={
            selected.length >= 5
              ? "Five favorites selected. You’re ready!"
              : "Search movies and series..."
          }
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setResults([]);
            setLoading(!!event.target.value.trim());
            setError("");
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActive((previous) =>
                Math.min(previous + 1, available.length - 1),
              );
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((previous) => Math.max(0, previous - 1));
            }
            if (event.key === "Enter" && active >= 0 && available[active]) {
              event.preventDefault();
              choose(available[active]);
            }
          }}
        />
      </div>
      {open && query.trim() && (
        <div className="search-dropdown">
          <div role="status">
            {loading
              ? "Searching the catalog…"
              : error ||
                (!available.length
                  ? "No matches. Try a different title or spelling."
                  : "")}
          </div>
          <ul id="movie-options" role="listbox" aria-label="Title results">
            {available.map((movie, index) => (
              <li
                key={movie.id}
                id={`movie-option-${index}`}
                role="option"
                aria-selected={active === index}
              >
                <button
                  className={active === index ? "active" : ""}
                  onClick={() => choose(movie)}
                >
                  <span>
                    <strong>{movie.title}</strong>
                    <small>
                      {movie.media_type === "series" ? "Series" : "Movie"} ·{" "}
                      {movie.year ?? "Year unknown"} ·{" "}
                      {movie.genres.join(" / ") || "Genres unavailable"}
                    </small>
                  </span>
                  <Plus size={18} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
