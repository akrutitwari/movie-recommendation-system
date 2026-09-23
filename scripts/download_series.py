"""Cache public TVmaze metadata. No recommendation API or key is used."""
from pathlib import Path
import argparse
from datetime import datetime, timezone
import hashlib
import json
import time
import urllib.request
import urllib.parse

DEST = Path(__file__).resolve().parents[1] / 'backend/data'

NETFLIX_ORIGINAL_TITLES = [
    'Stranger Things', 'The Crown', 'Bridgerton', 'Wednesday', 'Dark',
    'Narcos', 'Money Heist', 'Squid Game', 'The Witcher', 'Ozark',
    'Black Mirror', 'House of Cards', 'Orange Is the New Black',
    'BoJack Horseman', 'The Queen\'s Gambit', 'Mindhunter', 'The Last Kingdom',
    'You', 'The Umbrella Academy', 'Sex Education', 'Never Have I Ever',
    'Heartstopper', 'One Piece', '3 Body Problem', 'The Night Agent',
    'Anne with an E',
]

def compact(show, netflix_original=False):
    return {
        key: show.get(key)
        for key in ('id', 'name', 'genres', 'premiered', 'summary', 'image',
                    'url', 'network', 'webChannel')
    } | {'netflix_original': netflix_original}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pages', type=int, default=20, help='250 show IDs per page; default covers IDs below 5000.')
    args = parser.parse_args()
    if not 1 <= args.pages <= 500:
        parser.error('--pages must be between 1 and 500')
    shows = {}
    sources = []
    for page in range(args.pages):
        url = f'https://api.tvmaze.com/shows?page={page}'
        request = urllib.request.Request(url, headers={'User-Agent': 'CineMatch-educational-project/1.1'})
        with urllib.request.urlopen(request, timeout=30) as response:
            batch = json.load(response)
        for show in batch:
            shows[show['id']] = compact(show)
        sources.append(url)
        if (page + 1) % 10 == 0:
            print(f'Fetched {page + 1}/{args.pages} pages ({len(shows)} shows)', flush=True)
        time.sleep(0.55)  # Respect the public API's rate limit.
    for title in NETFLIX_ORIGINAL_TITLES:
        url = f'https://api.tvmaze.com/singlesearch/shows?q={urllib.parse.quote(title)}'
        request = urllib.request.Request(url, headers={'User-Agent': 'CineMatch-educational-project/1.1'})
        with urllib.request.urlopen(request, timeout=30) as response:
            show = json.load(response)
        # Curated flag: TVmaze has no complete Netflix Original catalog field.
        shows[show['id']] = compact(show, netflix_original=True)
        sources.append(url)
        time.sleep(0.55)
    DEST.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(list(shows.values()), ensure_ascii=False).encode()
    # Write only after all pages succeed, preserving an existing usable cache.
    temporary = DEST / 'series.json.tmp'
    temporary.write_bytes(payload)
    temporary.replace(DEST / 'series.json')
    manifest = {'source': 'TVmaze', 'license': 'CC BY-SA', 'license_url': 'https://www.tvmaze.com/api#licensing', 'sources': sources, 'downloaded_at': datetime.now(timezone.utc).isoformat(), 'shows': len(shows), 'sha256': hashlib.sha256(payload).hexdigest(), 'coverage': f'Show IDs below {args.pages * 250}, plus {len(NETFLIX_ORIGINAL_TITLES)} curated Netflix Original searches; neither is a complete catalog.'}
    (DEST / 'series-manifest.json').write_text(json.dumps(manifest, indent=2))
    print(f'Saved {len(shows)} series to {DEST / "series.json"}')

if __name__ == '__main__':
    main()
