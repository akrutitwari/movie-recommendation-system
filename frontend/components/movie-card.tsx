"use client";
import Image from "next/image";
import { useState } from "react";
import type { CSSProperties } from "react";
import { ChevronDown } from "lucide-react";
import type { Recommendation } from "@/types/movie";

/**
 * One credited entry in the billing block.
 *
 * Contribution is expressed the way a billing block expresses billing order:
 * as type size and weight. The strongest shared term is set largest, and the
 * numbers ride alongside rather than being replaced by a chart.
 */
export default function MovieCard({
  movie,
  index,
}: {
  movie: Recommendation;
  index: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const top = Math.max(
    ...movie.shared_features.map((f) => f.contribution),
    0.0001,
  );

  return (
    <article className="credit" style={{ "--i": index } as CSSProperties}>
      <div className="credit-poster">
        {movie.poster_url && !imageFailed ? (
          <Image
            unoptimized
            fill
            sizes="(max-width: 620px) 84px, 156px"
            src={movie.poster_url}
            alt={`${movie.title} poster`}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className={`fallback art-${index % 3}`}>
            <span>{movie.title}</span>
          </div>
        )}
      </div>

      <div className="credit-body">
        <div className="credit-top">
          <span className="credit-rank">{String(index + 1).padStart(2, "0")}</span>
          <h3>{movie.title}</h3>
          <span
            className="credit-score"
            title="Cosine similarity, not a probability of enjoyment"
          >
            {(movie.score * 100).toFixed(1)}
          </span>
        </div>

        <p className="credit-meta">
          {movie.media_type === "series" ? "Series" : "Movie"} ·{" "}
          {movie.year ?? "Year unknown"} ·{" "}
          {movie.genres.join(" / ") || "Genres unavailable"}
          {(movie.platforms?.length ?? 0) > 0 && ` · ${movie.platforms.join(", ")}`}
        </p>

        <div className="credit-line">
          <b>Based on</b>
          <span>{movie.selected_titles.join(" · ")}</span>
        </div>

        {movie.shared_features.length > 0 && (
          <div className="credit-line">
            <b>Shared</b>
            <span className="terms">
              {movie.shared_features.map((feature) => (
                <span
                  className="term"
                  key={feature.term}
                  style={
                    { "--w": (feature.contribution / top).toFixed(3) } as CSSProperties
                  }
                >
                  {feature.term} <i>{(feature.contribution * 100).toFixed(1)}</i>
                </span>
              ))}
            </span>
          </div>
        )}

        <p className="credit-overview">
          {movie.overview ||
            "No synopsis available. Discover this title through the tastes you share."}
        </p>

        <div className="credit-links">
          {movie.source_url && (
            <a href={movie.source_url} target="_blank" rel="noreferrer">
              View on TMDB ↗
            </a>
          )}
        </div>

        <details>
          <summary>
            Full credit <ChevronDown size={13} />
          </summary>
          <div className="explanation">
            <p>{movie.explanation}</p>
            <ul>
              {movie.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            <small>
              Points shown are each term&rsquo;s share of the{" "}
              {(movie.score * 100).toFixed(1)} score. Every term in the
              vocabulary contributes; the {movie.shared_features.length}{" "}
              strongest are set above, so they account for{" "}
              {(
                movie.shared_features.reduce((a, f) => a + f.contribution, 0) * 100
              ).toFixed(1)}{" "}
              of it.
            </small>
          </div>
        </details>
      </div>
    </article>
  );
}
