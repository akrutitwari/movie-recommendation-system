export interface Movie {
  id: number;
  media_type: "movie" | "series";
  source_url: string | null;
  platforms: string[];
  title: string;
  year: number | null;
  genres: string[];
  poster_url: string | null;
  overview: string | null;
}
export interface Recommendation extends Movie {
  score: number;
  content_score: number;
  shared_genres: string[];
  shared_features: { term: string; contribution: number }[];
  reasons: string[];
  explanation: string;
  selected_titles: string[];
}

export type MediaFilter = "all" | "movie" | "series";
