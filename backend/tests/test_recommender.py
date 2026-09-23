import json
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.data import normalize, content_features, SERIES_ID_OFFSET
from backend.app.recommender import Recommender

# A small, hand-built catalog standing in for a real TMDB download, so tests
# don't depend on a live TMDB key or a downloaded catalog file.
CATALOG = [
    {'id': 1, 'media_type': 'movie', 'title': 'Interstellar', 'year': 2014, 'genres': ['Sci-Fi', 'Drama'], 'popularity': 80, 'overview': None, 'poster_url': None, 'source_url': None},
    {'id': 2, 'media_type': 'movie', 'title': 'Inception', 'year': 2010, 'genres': ['Action', 'Sci-Fi', 'Thriller'], 'popularity': 90, 'overview': None, 'poster_url': None, 'source_url': None},
    {'id': 3, 'media_type': 'movie', 'title': 'Star Wars', 'year': 1977, 'genres': ['Sci-Fi', 'Adventure'], 'popularity': 95, 'overview': None, 'poster_url': None, 'source_url': None},
    {'id': 4, 'media_type': 'movie', 'title': 'Star Trek', 'year': 2009, 'genres': ['Sci-Fi', 'Adventure'], 'popularity': 70, 'overview': None, 'poster_url': None, 'source_url': None},
    {'id': 5, 'media_type': 'movie', 'title': 'Starship Troopers', 'year': 1997, 'genres': ['Sci-Fi', 'Action'], 'popularity': 50, 'overview': None, 'poster_url': None, 'source_url': None},
    {'id': 6, 'media_type': 'movie', 'title': 'A Quiet Drama', 'year': 2005, 'genres': ['Drama'], 'popularity': 20, 'overview': None, 'poster_url': None, 'source_url': None},
    {'id': 7, 'media_type': 'movie', 'title': 'Old Classic', 'year': 1950, 'genres': ['Drama'], 'popularity': 5, 'overview': None, 'poster_url': None, 'source_url': None},
    {'id': 8, 'media_type': 'movie', 'title': 'Comedy Night', 'year': 2022, 'genres': ['Comedy'], 'popularity': 10, 'overview': None, 'poster_url': None, 'source_url': None},
    {'id': SERIES_ID_OFFSET + 1, 'media_type': 'series', 'title': 'Breaking Bad', 'year': 2008, 'genres': ['Crime', 'Drama', 'Thriller'], 'popularity': 99, 'overview': 'A chemistry teacher.', 'poster_url': None, 'source_url': 'https://www.themoviedb.org/tv/1'},
    {'id': SERIES_ID_OFFSET + 2, 'media_type': 'series', 'title': 'Better Call Saul', 'year': 2015, 'genres': ['Crime', 'Drama'], 'popularity': 60, 'overview': None, 'poster_url': None, 'source_url': None},
    {'id': SERIES_ID_OFFSET + 3, 'media_type': 'series', 'title': 'Star Trek: Discovery', 'year': 2017, 'genres': ['Sci-Fi', 'Adventure'], 'popularity': 55, 'overview': None, 'poster_url': None, 'source_url': None},
    {'id': SERIES_ID_OFFSET + 4, 'media_type': 'series', 'title': 'The Wire', 'year': 2002, 'genres': ['Crime', 'Drama'], 'popularity': 65, 'overview': None, 'poster_url': None, 'source_url': None},
    {'id': SERIES_ID_OFFSET + 5, 'media_type': 'series', 'title': 'Ozark', 'year': 2017, 'genres': ['Crime', 'Drama', 'Thriller'], 'popularity': 70, 'overview': None, 'poster_url': None, 'source_url': None},
    {'id': SERIES_ID_OFFSET + 6, 'media_type': 'series', 'title': 'Old Sitcom', 'year': 1965, 'genres': ['Comedy'], 'popularity': 3, 'overview': None, 'poster_url': None, 'source_url': None},
    {'id': SERIES_ID_OFFSET + 7, 'media_type': 'series', 'title': 'Space Drifters', 'year': 2021, 'genres': ['Sci-Fi'], 'popularity': 30, 'overview': None, 'poster_url': None, 'source_url': None},
    {'id': SERIES_ID_OFFSET + 8, 'media_type': 'series', 'title': 'Quiet Nights', 'year': 2019, 'genres': ['Drama'], 'popularity': 15, 'overview': None, 'poster_url': None, 'source_url': None},
]

def build_catalog(records=CATALOG) -> pd.DataFrame:
    """Mirrors backend.app.data.load_catalog's transform, without needing a
    downloaded tmdb_catalog.json file on disk."""
    catalog = pd.DataFrame.from_records(records).rename(columns={'id': 'movieId'})
    catalog['search_title'] = catalog['title'].map(normalize)
    catalog['features'] = catalog.apply(lambda row: content_features(row.title, row.genres), axis=1)
    return catalog.sort_values('movieId').reset_index(drop=True)

@pytest.fixture(scope='session', autouse=True)
def fake_tmdb_catalog_file(tmp_path_factory):
    """The FastAPI app loads its catalog from disk at startup; point it at a
    temp file holding the same synthetic catalog used by the other fixtures."""
    from backend.app import data
    data_dir = tmp_path_factory.mktemp('tmdb_data')
    (data_dir / 'tmdb_catalog.json').write_text(json.dumps(CATALOG))
    patcher = pytest.MonkeyPatch()
    patcher.setattr(data, 'DATA_DIR', data_dir)
    yield
    patcher.undo()

@pytest.fixture(scope='module')
def model():
    return Recommender(build_catalog([r for r in CATALOG if r['media_type'] == 'movie']))

@pytest.fixture(scope='module')
def catalog_model():
    return Recommender(build_catalog())

@pytest.fixture(scope='module')
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture(autouse=True)
def no_real_network_calls(monkeypatch):
    """Enrichment can make real HTTP calls (TMDB watch/providers); no test
    here should depend on outbound network access."""
    import httpx
    from backend.app import enrichment
    def blocked(*args, **kwargs):
        raise httpx.ConnectError('network disabled in tests')
    monkeypatch.setattr(httpx, 'get', blocked)
    enrichment.platforms_for.cache_clear()

def test_search(model):
    assert model.search('INTERSTELLAR')[0]['title'] == 'Interstellar'
    assert model.search('  ') == []
    assert model.search('zzzznoresults') == []
    assert len(model.search('star', limit=3)) == 3

def test_recommendation_ranking_and_exclusion(model):
    ids = [model.search('Interstellar')[0]['id'], model.search('Inception')[0]['id']]
    results = model.recommend(ids, limit=5)
    assert len(results) == 5
    assert not set(ids) & {movie['id'] for movie in results}
    scores = [movie['score'] for movie in results]
    assert scores == sorted(scores, reverse=True)
    assert all(0 <= score <= 1 for score in scores)
    assert len({movie['id'] for movie in results}) == 5
    assert model.recommend(ids + [ids[0]], limit=5) == results

def test_score_blends_content_popularity_and_recency(model):
    ids = [1, 2]
    result = model.recommend(ids, 1)[0]
    taste = np.asarray(model.matrix[[model.id_to_index[mid] for mid in ids]].mean(axis=0)).ravel()
    movie = model.matrix[model.id_to_index[result['id']]].toarray().ravel()
    content = float(np.dot(taste, movie) / (np.linalg.norm(taste) * np.linalg.norm(movie)))
    assert result['content_score'] == pytest.approx(content)
    assert sum(f['contribution'] for f in result['shared_features']) <= result['content_score'] + 1e-12
    # The final score is content-dominant but not identical to raw content similarity.
    assert result['score'] != pytest.approx(result['content_score'])

def test_unknown_id(model):
    with pytest.raises(ValueError, match='Unknown'):
        model.recommend([99999999])

def test_empty_selection(model):
    with pytest.raises(ValueError):
        model.recommend([])

def test_features():
    assert content_features('Space (Test)', ['Sci-Fi']).split() == ['scifi', 'scifi', 'scifi', 'space', 'test']

def test_health(client):
    response = client.get('/health')
    assert response.status_code == 200
    body = response.json()
    assert body['movies'] == 8
    assert body['series'] == 8
    assert body['titles'] == 16

def test_api_search(client):
    assert client.get('/movies/search?q=interstellar').json()[0]['title'] == 'Interstellar'
    assert client.get('/movies/search?q=').status_code == 422

def test_api_recommend(client):
    response = client.post('/recommend', json={'movie_ids': [1, 2], 'limit': 5})
    assert response.status_code == 200
    assert len(response.json()['recommendations']) == 5
    assert client.post('/recommend', json={'movie_ids': [9999999]}).status_code == 400

@pytest.mark.parametrize('body', [{'movie_ids': []}, {'movie_ids': [1], 'limit': 0}, {'movie_ids': [1], 'limit': 21}, {'movie_ids': [1, 2, 3, 4, 5, 6]}, {'movie_ids': ['1']}, {'movie_ids': [True]}, {'movie_ids': [-1]}])
def test_validation(client, body):
    assert client.post('/recommend', json=body).status_code == 422

def test_presentation_format_not_a_feature(model):
    assert all('imax' not in genres for genres in [[]] for genres in model.movies.genres)

def test_series_search_and_namespaces(catalog_model):
    results = catalog_model.search('Breaking Bad')
    show = next(item for item in results if item['media_type'] == 'series')
    assert show['id'] >= SERIES_ID_OFFSET
    assert show['overview'] == 'A chemistry teacher.'
    assert show['source_url'] == 'https://www.themoviedb.org/tv/1'
    assert catalog_model.movies.movieId.is_unique

def test_mixed_favorites_and_type_filters(catalog_model):
    movie = catalog_model.search('Interstellar')[0]
    series = next(item for item in catalog_model.search('Breaking Bad') if item['media_type'] == 'series')
    ids = [movie['id'], series['id']]
    for media_type in ('all', 'movie', 'series'):
        results = catalog_model.recommend(ids, 5, media_type)
        assert len(results) == 5
        assert not set(ids) & {item['id'] for item in results}
        assert [item['score'] for item in results] == sorted([item['score'] for item in results], reverse=True)
        if media_type != 'all':
            assert all(item['media_type'] == media_type for item in results)

def test_series_api(client):
    response = client.get('/titles/search?q=Breaking%20Bad')
    assert response.status_code == 200
    show = next(item for item in response.json() if item['media_type'] == 'series')
    results = client.post('/recommend', json={'movie_ids': [show['id']], 'media_type': 'series', 'limit': 5}).json()['recommendations']
    assert len(results) == 5
    assert all(item['media_type'] == 'series' and item['id'] != show['id'] for item in results)
    assert client.post('/recommend', json={'movie_ids': [1], 'media_type': 'invalid'}).status_code == 422
    assert client.get('/health').json()['series'] > 0

def test_platforms_fallback_when_tmdb_unavailable(monkeypatch):
    from backend.app.enrichment import enrich
    monkeypatch.delenv('TMDB_API_KEY', raising=False)
    movie = {'id': 1, 'media_type': 'movie', 'platforms': []}
    assert enrich(movie) == movie

def test_platforms_lookup_failure_is_optional(monkeypatch):
    import httpx
    from backend.app.enrichment import enrich, platforms_for
    monkeypatch.setenv('TMDB_API_KEY', 'test-only-not-real')
    def failure(*args, **kwargs):
        raise httpx.ConnectError('offline')
    monkeypatch.setattr(httpx, 'get', failure)
    platforms_for.cache_clear()
    movie = {'id': 1, 'media_type': 'movie', 'platforms': []}
    assert enrich(movie) == {**movie, 'platforms': []}

def test_platforms_lookup_success(monkeypatch):
    import httpx
    from backend.app.enrichment import enrich, platforms_for
    monkeypatch.setenv('TMDB_API_KEY', 'test-only-not-real')
    class FakeResponse:
        def raise_for_status(self): pass
        def json(self):
            return {'results': {'US': {'flatrate': [{'provider_name': 'Netflix'}, {'provider_name': 'Prime Video'}]}}}
    monkeypatch.setattr(httpx, 'get', lambda *a, **k: FakeResponse())
    platforms_for.cache_clear()
    movie = {'id': 1, 'media_type': 'movie', 'platforms': []}
    assert enrich(movie)['platforms'] == ['Netflix', 'Prime Video']
