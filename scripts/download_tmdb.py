"""Build a fresh, current movie+series catalog from TMDB (themoviedb.org).

Replaces the old, frozen-in-2018 MovieLens+TVmaze snapshot with an
up-to-date pool of titles, weighted toward what's currently popular and
recently released, so recommendations aren't stuck recommending decades-old
obscure titles.

Needs a free TMDB API key: https://www.themoviedb.org/settings/api
    export TMDB_API_KEY=your_key_here
    python scripts/download_tmdb.py
"""
from pathlib import Path
import argparse
import hashlib
import json
import os
import time
from datetime import datetime, timezone
import httpx

DEST = Path(__file__).resolve().parents[1] / 'backend/data'
BASE = 'https://api.themoviedb.org/3'
SERIES_ID_OFFSET = 1_000_000_000

# Three complementary lists per media type: what's popular right now, what's
# rated highly of all time, and what's newest. Overlaps are deduplicated.
MOVIE_LISTS = [
    ('/movie/popular', {}),
    ('/movie/top_rated', {}),
    ('/discover/movie', {'sort_by': 'primary_release_date.desc', 'vote_count.gte': 50}),
]
TV_LISTS = [
    ('/tv/popular', {}),
    ('/tv/top_rated', {}),
    ('/discover/tv', {'sort_by': 'first_air_date.desc', 'vote_count.gte': 50}),
]

def genre_map(key: str, kind: str) -> dict[int, str]:
    response = httpx.get(f'{BASE}/genre/{kind}/list', params={'api_key': key}, timeout=15)
    response.raise_for_status()
    return {g['id']: g['name'] for g in response.json()['genres']}

def fetch_pages(key: str, path: str, params: dict, pages: int) -> list[dict]:
    results = []
    for page in range(1, pages + 1):
        response = httpx.get(f'{BASE}{path}', params={**params, 'api_key': key, 'page': page}, timeout=15)
        response.raise_for_status()
        data = response.json()
        results.extend(data.get('results', []))
        if page >= data.get('total_pages', page):
            break
        time.sleep(0.03)  # Polite pacing; TMDB's real limit is generous.
    return results

def compact(item: dict, is_movie: bool, genres_by_id: dict[int, str]) -> dict:
    title = item.get('title') if is_movie else item.get('name')
    date = item.get('release_date') if is_movie else item.get('first_air_date')
    year = int(date[:4]) if date and date[:4].isdigit() else None
    genres = [g for g in (genres_by_id.get(gid) for gid in item.get('genre_ids', [])) if g]
    poster = item.get('poster_path')
    return {
        'id': item['id'] if is_movie else SERIES_ID_OFFSET + item['id'],
        'tmdb_id': item['id'],
        'media_type': 'movie' if is_movie else 'series',
        'title': title or 'Untitled',
        'year': year,
        'genres': genres,
        'overview': item.get('overview') or None,
        'poster_url': f'https://image.tmdb.org/t/p/w500{poster}' if poster else None,
        'popularity': float(item.get('popularity') or 0),
        'vote_average': float(item.get('vote_average') or 0),
        'vote_count': int(item.get('vote_count') or 0),
        'source_url': f'https://www.themoviedb.org/{"movie" if is_movie else "tv"}/{item["id"]}',
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pages', type=int, default=100,
                         help='Pages per list; 20 titles/page. Default ~100 pages x 3 lists x 2 media types.')
    args = parser.parse_args()
    if not 1 <= args.pages <= 500:
        parser.error('--pages must be between 1 and 500')
    key = os.getenv('TMDB_API_KEY')
    if not key:
        raise SystemExit('Set TMDB_API_KEY first, e.g.: export TMDB_API_KEY=your_key_here')

    catalog: dict[int, dict] = {}
    sources = []
    for is_movie, lists in ((True, MOVIE_LISTS), (False, TV_LISTS)):
        genres_by_id = genre_map(key, 'movie' if is_movie else 'tv')
        for path, extra_params in lists:
            items = fetch_pages(key, path, extra_params, args.pages)
            for item in items:
                if not item.get('poster_path'):
                    continue  # Skip titles with no artwork; posters are the point.
                entry = compact(item, is_movie, genres_by_id)
                catalog[entry['id']] = entry
            sources.append(f'{BASE}{path}')
            print(f'{path}: {len(items)} fetched, {len(catalog)} unique titles so far', flush=True)

    if not catalog:
        raise SystemExit('No titles fetched; check your TMDB_API_KEY and network access.')

    DEST.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(list(catalog.values()), ensure_ascii=False).encode()
    temp = DEST / 'tmdb_catalog.json.tmp'
    temp.write_bytes(payload)
    temp.replace(DEST / 'tmdb_catalog.json')
    manifest = {
        'source': 'TMDB', 'terms_url': 'https://www.themoviedb.org/documentation/api/terms-of-use',
        'sources': sources, 'downloaded_at': datetime.now(timezone.utc).isoformat(),
        'titles': len(catalog), 'sha256': hashlib.sha256(payload).hexdigest(),
        'note': 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
    }
    (DEST / 'tmdb-manifest.json').write_text(json.dumps(manifest, indent=2))
    print(f'Saved {len(catalog)} titles to {DEST / "tmdb_catalog.json"}')

if __name__ == '__main__':
    main()
