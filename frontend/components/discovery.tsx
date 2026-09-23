"use client";
import { useRef, useState, useEffect } from "react";
import type { CSSProperties } from "react";
import { ArrowRight, Clapperboard, X } from "lucide-react";
import MovieSearch from "./movie-search";
import MovieCard from "./movie-card";
import HeroCube from "./hero-cube";
import type { CharacterGender } from "./hero-cube";
import SpotlightRail from "./spotlight-rail";
import { recommendMovies } from "@/lib/api";
import type { Movie, Recommendation, MediaFilter } from "@/types/movie";

type Health = { status: string; titles?: number; movies?: number; series?: number };

export default function Discovery() {
  const [mediaType, setMediaType] = useState<MediaFilter>("all");
  const [selected, setSelected] = useState<Movie[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState<number | null>(null);
  const [health, setHealth] = useState<Health | null | "unreachable">(null);
  const [characterGender, setCharacterGender] = useState<CharacterGender>("male");
  const pending = useRef<AbortController | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      pending.current?.abort();
      if (exitTimer.current) clearTimeout(exitTimer.current);
    },
    [],
  );

  useEffect(() => {
    function syncCharacterGender() {
      const preview = new URLSearchParams(window.location.search).get("gender");
      const stored = window.localStorage.getItem("cinematch:profile-gender");
      setCharacterGender(
        preview === "female" || (preview !== "male" && stored === "female")
          ? "female"
          : "male",
      );
    }

    syncCharacterGender();
    window.addEventListener("storage", syncCharacterGender);
    window.addEventListener("cinematch:profile-updated", syncCharacterGender);
    return () => {
      window.removeEventListener("storage", syncCharacterGender);
      window.removeEventListener("cinematch:profile-updated", syncCharacterGender);
    };
  }, []);

  // The slab credits the catalog it is actually serving. A backend that
  // cannot report a real catalog is credited as demo data rather than
  // letting fixture titles read as fact.
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no health"))))
      .then((body: Health) =>
        setHealth(typeof body?.titles === "number" ? body : "unreachable"),
      )
      .catch(() => {
        if (!controller.signal.aborted) setHealth("unreachable");
      });
    return () => controller.abort();
  }, []);

  function changeSelection(next: Movie[]) {
    pending.current?.abort();
    setLoading(false);
    setSelected(next);
    setRecommendations([]);
    setGenerated(false);
    setError("");
  }

  function removeMovie(id: number) {
    if (leaving !== null) return;
    const instant =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const drop = () => {
      setLeaving(null);
      changeSelection(selected.filter((item) => item.id !== id));
    };
    if (instant) return drop();
    setLeaving(id);
    exitTimer.current = setTimeout(drop, 170);
  }

  async function generate() {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setError("");
    try {
      const data = await recommendMovies(
        selected.map((movie) => movie.id),
        AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        mediaType,
      );
      if (!controller.signal.aborted) {
        setRecommendations(data.recommendations);
        setGenerated(true);
      }
    } catch (err) {
      if (!controller.signal.aborted)
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  const canRoll = selected.length > 0 && !loading;

  return (
    <>
      {/* The one-sheet: title treatment, the action struck directly beneath
          it, then the rule and the billing slab. */}
      <section className="sheet">
        <div className="sheet-copy">
          <h1>
            Ten titles.
            <em>Every reason shown.</em>
          </h1>
          <p className="sheet-lede">
            Name a few things you loved. CineMatch reads what they are made of
            and credits the ten it draws from them — with the terms, and the
            arithmetic, set beside each one.
          </p>

          <div className="search-row">
            <MovieSearch
              selected={selected}
              onSelect={(movie) => {
                if (
                  selected.length < 5 &&
                  !selected.some((item) => item.id === movie.id)
                )
                  changeSelection([...selected, movie]);
              }}
            />
            <button className="primary-button" disabled={!canRoll} onClick={generate}>
              {loading ? (
                "Reading…"
              ) : (
                <>
                  Roll credits <ArrowRight size={17} />
                </>
              )}
            </button>
          </div>

        </div>

        <div className="sheet-controls">
          <div className="cast">
            <span className="cast-label">
              Cast <b>{selected.length}</b>/5
            </span>
            {selected.map((movie) => (
              <button
                className={`taste-chip${leaving === movie.id ? " leaving" : ""}`}
                key={movie.id}
                aria-label={`Remove ${movie.title}`}
                onClick={() => removeMovie(movie.id)}
              >
                {movie.title} <X size={12} />
              </button>
            ))}
            {!selected.length && (
              <span className="selection-hint">
                Start with one. Three to five reads clearest.
              </span>
            )}
          </div>

          <div className="media-filter" role="group" aria-label="Recommendation type">
            <span>Bill</span>
            {(
              [
                ["all", "Movies & series"],
                ["movie", "Movies"],
                ["series", "Series"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                aria-pressed={mediaType === value}
                onClick={() => {
                  setMediaType(value);
                  changeSelection(selected);
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="sr-only" role="status">
            {selected.length} titles selected.
          </p>
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
        </div>

        <HeroCube gender={characterGender} />
      </section>

      <div className="slab">
        <b>CineMatch</b>
        <span>A content-based recommender</span>
        <span className="gold">TF-IDF &amp; cosine similarity</span>
        <span>Catalog by TMDB</span>
        <span>Series data TVmaze CC BY-SA</span>
        <span>Match is content similarity — not a rating</span>
        {health === "unreachable" ? (
          <span className="warn">Demo data — no live catalog connected</span>
        ) : health ? (
          <span>
            {health.titles?.toLocaleString()} titles scored
          </span>
        ) : null}
      </div>

      {!generated && (
        <SpotlightRail
          selected={selected}
          onPick={(movie) => {
            if (
              selected.length < 5 &&
              !selected.some((item) => item.id === movie.id)
            )
              changeSelection([...selected, movie]);
          }}
        />
      )}

      <section className="act credits" aria-labelledby="results-title" aria-busy={loading}>
        <div className="act-head">
          <h2 id="results-title">{generated ? "The billing" : "Your next great watch"}</h2>
          {generated && <p>{recommendations.length} credited · ranked by your taste</p>}
        </div>

        {loading && recommendations.length > 0 ? (
          /* Decay as state: the superseded billing holds and fades while the
             next one computes. No spinner rides on top of it. */
          <>
            <p className="loading-note">Re-scoring the catalog against your cast</p>
            <div className="stale" aria-hidden="true">
              {recommendations.map((movie, index) => (
                <MovieCard key={movie.id} movie={movie} index={index} />
              ))}
            </div>
            <p className="sr-only" role="status">
              Recalculating recommendations.
            </p>
          </>
        ) : loading ? (
          <>
            <p className="loading-note">Scoring the catalog against your cast</p>
            <div aria-hidden="true">
              {Array.from({ length: 6 }, (_, position) => (
                <div
                  className="skeleton-credit"
                  key={position}
                  style={{ "--i": position } as CSSProperties}
                >
                  <div className="skeleton-poster" />
                  <div className="skeleton-lines">
                    <div />
                    <div />
                    <div />
                    <div />
                  </div>
                </div>
              ))}
            </div>
            <p className="sr-only" role="status">
              Finding recommendations.
            </p>
          </>
        ) : generated ? (
          <>
            <p className="credit-note">
              Match is content similarity — not a rating, and not a prediction
              of enjoyment. Each term below is set at the size of its share of
              the score, in points of 100. Artwork is illustrative when a
              poster is unavailable.
            </p>
            {recommendations.map((movie, index) => (
              <MovieCard key={movie.id} movie={movie} index={index} />
            ))}
            {!recommendations.length && (
              <div className="empty">
                <h3>No overlap found</h3>
                <p>
                  Nothing in the catalog shares enough features with this cast.
                  Try adding another title.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="empty empty--ready">
            <Clapperboard size={40} strokeWidth={1.3} />
            <h3>{selected.length ? "Your cast is taking shape" : "The projector is ready"}</h3>
            <p>
              {selected.length
                ? "Add another title for a sharper read, or roll the credits now."
                : "Search above or choose a house selection to begin."}
            </p>
          </div>
        )}
      </section>
    </>
  );
}
