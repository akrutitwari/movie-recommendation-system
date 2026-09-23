"""Optional live lookup of streaming platforms (Netflix, Prime Video, etc.)
via TMDB's watch/providers endpoint. Posters/overviews are already baked into
the catalog at download time (scripts/download_tmdb.py), so this only adds
"where can I watch this" for the handful of titles a single request returns.
Failure never changes recommendations."""
from functools import lru_cache
import os
import httpx
from .data import SERIES_ID_OFFSET

REGION = 'US'  # TMDB reports availability per country; US is the default.

@lru_cache(maxsize=4096)
def platforms_for(tmdb_id: int, kind: str, key: str) -> tuple[str, ...]:
    try:
        response = httpx.get(f'https://api.themoviedb.org/3/{kind}/{tmdb_id}/watch/providers',
                              params={'api_key': key}, timeout=2)
        response.raise_for_status()
        region = response.json().get('results', {}).get(REGION, {})
        # "flatrate" = included with a subscription, which is what people mean
        # by "available on Netflix/Prime" (as opposed to renting or buying).
        providers = region.get('flatrate', [])
        return tuple(dict.fromkeys(p['provider_name'] for p in providers if p.get('provider_name')))
    except (httpx.HTTPError, ValueError, KeyError):
        return ()

def enrich(movie: dict) -> dict:
    key = os.getenv('TMDB_API_KEY')
    if not key:
        return movie
    is_series = movie.get('media_type') == 'series'
    tmdb_id = movie['id'] - SERIES_ID_OFFSET if is_series else movie['id']
    return {**movie, 'platforms': list(platforms_for(tmdb_id, 'tv' if is_series else 'movie', key))}
