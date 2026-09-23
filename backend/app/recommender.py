"""A small, explainable recommender: taste (content) similarity blended with
a popularity/recency boost, so close calls favor what's currently popular and
recent rather than an arbitrary obscure tie. No LLM or ratings model."""
from collections import Counter
from datetime import date
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from .data import normalize

# Taste match dominates the score; popularity and recency only nudge ranking.
CONTENT_WEIGHT = 0.7
POPULARITY_WEIGHT = 0.15
RECENCY_WEIGHT = 0.15
RECENCY_HALF_LIFE_YEARS = 6  # A title this old keeps half its recency credit.

class Recommender:
    def __init__(self, movies: pd.DataFrame):
        self.movies = movies
        self.id_to_index = {int(mid): i for i, mid in enumerate(movies.movieId)}
        # A column represents a word; a row represents a title. TF-IDF gives
        # less weight to words appearing throughout the catalog. L2
        # normalization makes each title vector have length 1.
        self.vectorizer = TfidfVectorizer(stop_words='english', strip_accents='unicode', dtype=np.float64)
        self.matrix = self.vectorizer.fit_transform(movies.features)
        self.terms = self.vectorizer.get_feature_names_out()
        popularity = movies.popularity.astype(float).clip(lower=0)
        peak = popularity.max()
        self.norm_popularity = (popularity / peak).to_numpy() if peak > 0 else np.zeros(len(movies))
        current_year = date.today().year
        age_years = (current_year - movies.year.fillna(current_year - 100)).clip(lower=0)
        self.recency = np.exp(-age_years.to_numpy() * np.log(2) / RECENCY_HALF_LIFE_YEARS)

    def movie(self, index: int) -> dict:
        row = self.movies.iloc[index]
        # pandas can turn an explicit None into a float NaN in a mixed
        # object column; pd.notna() catches both so the API never sees NaN.
        clean = lambda value: value if pd.notna(value) else None
        return {'id': int(row.movieId), 'title': row.title,
                'year': int(row.year) if pd.notna(row.year) else None,
                'genres': row.genres, 'media_type': row.get('media_type', 'movie'),
                'poster_url': clean(row.get('poster_url')), 'overview': clean(row.get('overview')),
                'source_url': clean(row.get('source_url')), 'platforms': []}

    def search(self, query: str, limit: int = 8) -> list[dict]:
        query = normalize(query)
        if not query:
            return []
        matches = [i for i, title in enumerate(self.movies.search_title) if query in title]
        # Prefix matches first, then more popular titles, then shorter titles.
        matches.sort(key=lambda i: (not self.movies.iloc[i].search_title.startswith(query),
                                     -self.movies.iloc[i].popularity, len(self.movies.iloc[i].title), i))
        return [self.movie(i) for i in matches[:limit]]

    def recommend(self, movie_ids: list[int], limit: int = 10, media_type: str = 'all') -> list[dict]:
        if media_type not in ('all', 'movie', 'series'):
            raise ValueError('Invalid media type.')
        ids = list(dict.fromkeys(movie_ids))
        if not ids:
            raise ValueError('Select at least one movie.')
        missing = [mid for mid in ids if mid not in self.id_to_index]
        if missing:
            raise ValueError(f'Unknown movie IDs: {missing}')
        indices = [self.id_to_index[mid] for mid in ids]
        # Average favorite vectors: each favorite gets an equal vote in taste.
        taste = np.asarray(self.matrix[indices].mean(axis=0))
        # Cosine measures direction, rather than vector length. With
        # nonnegative TF-IDF features it lies in [0, 1]. It is NOT a
        # probability of liking.
        content_scores = np.clip(cosine_similarity(taste, self.matrix).ravel(), 0, 1)
        blended = np.clip(CONTENT_WEIGHT * content_scores
                           + POPULARITY_WEIGHT * self.norm_popularity
                           + RECENCY_WEIGHT * self.recency, 0, 1)
        blended[indices] = -1  # Never recommend a selected title again.
        # Stable sorting gives deterministic ID order for exact ties.
        ranked = np.argsort(-blended, kind='stable')
        genre_counts = Counter(g for i in indices for g in self.movies.iloc[i].genres)
        taste_unit = taste.ravel() / max(np.linalg.norm(taste), 1e-12)
        results = []
        for index in ranked:
            if blended[index] <= 0 or len(results) >= limit:
                break
            item = self.movie(int(index))
            if media_type in ('movie', 'series') and item['media_type'] != media_type:
                continue
            overlap = sorted(set(item['genres']) & genre_counts.keys(), key=lambda g: (-genre_counts[g], g))
            # Per-term products sum to the content (cosine) score, which is
            # 70% of the final blended score. These are faithful local
            # explanations of the taste-matching part of the ranking.
            contributions = self.matrix[index].multiply(taste_unit).tocsr()
            ordered = sorted(zip(contributions.indices, contributions.data), key=lambda pair: (-pair[1], pair[0]))
            features = [{'term': str(self.terms[j]), 'contribution': float(v)} for j, v in ordered if v > 0][:6]
            reasons = [f'{g} appears in {genre_counts[g]} of your {len(ids)} favorites.' for g in overlap]
            reasons.append('Shared TF-IDF terms drive the taste-similarity part of the score.')
            if self.norm_popularity[index] > 0.4:
                reasons.append('Currently popular, which gives it a small ranking boost.')
            if self.recency[index] > 0.5:
                reasons.append('A recent release, which gives it a small ranking boost.')
            results.append({**item, 'score': float(blended[index]), 'content_score': float(content_scores[index]),
                            'shared_genres': overlap, 'shared_features': features, 'reasons': reasons,
                            'explanation': 'Shared tastes: ' + ', '.join(overlap) + '.' if overlap else 'Connected through shared title terms.',
                            'selected_titles': [self.movies.iloc[i].title for i in indices]})
        return results
