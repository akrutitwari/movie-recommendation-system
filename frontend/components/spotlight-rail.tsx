"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Movie } from "@/types/movie";

const spotlight: Movie[] = [
  {
    id: 693134,
    media_type: "movie",
    source_url: "https://www.themoviedb.org/movie/693134",
    platforms: [],
    title: "Dune: Part Two",
    year: 2024,
    genres: ["Science fiction", "Adventure"],
    poster_url: "https://image.tmdb.org/t/p/w780/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    overview: "Power, prophecy and survival collide on the sands of Arrakis.",
  },
  {
    id: 872585,
    media_type: "movie",
    source_url: "https://www.themoviedb.org/movie/872585",
    platforms: [],
    title: "Oppenheimer",
    year: 2023,
    genres: ["Drama", "History"],
    poster_url: "https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    overview: "A portrait of ambition, consequence and the machinery of history.",
  },
  {
    id: 666277,
    media_type: "movie",
    source_url: "https://www.themoviedb.org/movie/666277",
    platforms: [],
    title: "Past Lives",
    year: 2023,
    genres: ["Drama", "Romance"],
    poster_url: "https://image.tmdb.org/t/p/w780/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg",
    overview: "Two childhood friends meet again and consider the lives left unlived.",
  },
  {
    id: 840430,
    media_type: "movie",
    source_url: "https://www.themoviedb.org/movie/840430",
    platforms: [],
    title: "The Holdovers",
    year: 2023,
    genres: ["Comedy", "Drama"],
    poster_url: "https://image.tmdb.org/t/p/w780/VHSzNBTwxV8vh7wylo7O9CLdac.jpg",
    overview: "Three stranded souls find a little warmth during a cold school break.",
  },
  {
    id: 965150,
    media_type: "movie",
    source_url: "https://www.themoviedb.org/movie/965150",
    platforms: [],
    title: "Aftersun",
    year: 2022,
    genres: ["Drama"],
    poster_url: "https://image.tmdb.org/t/p/w780/evKz85EKouVbIr51zy5fOtpNRPg.jpg",
    overview: "A daughter revisits the luminous fragments of a holiday with her father.",
  },
];

function SpotlightPoster({
  movie,
  index,
  chosen,
  onPick,
}: {
  movie: Movie;
  index: number;
  chosen: boolean;
  onPick: (movie: Movie) => void;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <button
      className="spotlight-card"
      style={{ "--i": index } as CSSProperties}
      onClick={() => onPick(movie)}
      disabled={chosen}
      aria-label={chosen ? `${movie.title} is in your cast` : `Add ${movie.title} to your cast`}
    >
      <span className="spotlight-poster">
        {movie.poster_url && !failed ? (
          <Image
            unoptimized
            fill
            sizes="(max-width: 620px) 44vw, (max-width: 900px) 28vw, 220px"
            src={movie.poster_url}
            alt={`${movie.title} poster`}
            onError={() => setFailed(true)}
          />
        ) : (
          <span className={`spotlight-fallback art-${index % 3}`} />
        )}
        <span className="spotlight-shade" />
        <span className="spotlight-index">0{index + 1}</span>
        <span className="spotlight-action" aria-hidden="true">
          {chosen ? "Added" : "+ Cast"}
        </span>
      </span>
      <span className="spotlight-copy">
        <strong>{movie.title}</strong>
        <small>{movie.year} · {movie.genres.join(" / ")}</small>
        <span>{movie.overview}</span>
      </span>
    </button>
  );
}

export default function SpotlightRail({
  selected,
  onPick,
}: {
  selected: Movie[];
  onPick: (movie: Movie) => void;
}) {
  const rail = useRef<HTMLDivElement>(null);

  function move(direction: -1 | 1) {
    rail.current?.scrollBy({ left: direction * 420, behavior: "smooth" });
  }

  return (
    <section className="spotlight" aria-labelledby="spotlight-title">
      <div className="spotlight-head">
        <div>
          <span className="spotlight-kicker bill">The house selection · 01—05</span>
          <h2 id="spotlight-title">Start with a spark.</h2>
        </div>
        <p>Five sharply different films. Add one to your cast and let the catalog follow the thread.</p>
        <div className="spotlight-controls" aria-label="Scroll house selection">
          <button onClick={() => move(-1)} aria-label="Previous films">←</button>
          <button onClick={() => move(1)} aria-label="Next films">→</button>
        </div>
      </div>
      <div className="spotlight-track" ref={rail}>
        {spotlight.map((movie, index) => (
          <SpotlightPoster
            key={movie.id}
            movie={movie}
            index={index}
            chosen={selected.some((item) => item.id === movie.id)}
            onPick={onPick}
          />
        ))}
      </div>
    </section>
  );
}
