from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, HTTPException, Query, Request
from .data import load_catalog
from .recommender import Recommender
from .schemas import Movie, RecommendRequest, RecommendResponse, Health
from .enrichment import enrich

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fit once at startup, rather than refitting on every request.
    app.state.recommender = Recommender(load_catalog())
    yield

app = FastAPI(title='CineMatch API', version='1.0.0', lifespan=lifespan)

@app.get('/health', response_model=Health)
def health(request: Request):
    model = request.app.state.recommender
    return {'status': 'ok', 'movies': int((model.movies.media_type == 'movie').sum()), 'series': int((model.movies.media_type == 'series').sum()), 'titles': len(model.movies), 'features': model.matrix.shape[1]}

@app.get('/titles/search', response_model=list[Movie])
@app.get('/movies/search', response_model=list[Movie])
def search(request: Request, q: str = Query(min_length=1, max_length=100), limit: int = Query(default=8, ge=1, le=20)):
    return request.app.state.recommender.search(q, limit)

@app.post('/recommend', response_model=RecommendResponse)
def recommend(body: RecommendRequest, request: Request):
    model = request.app.state.recommender
    try:
        recommendations = model.recommend(body.movie_ids, body.limit, body.media_type)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    with ThreadPoolExecutor(max_workers=10) as executor:
        recommendations = list(executor.map(enrich, recommendations))
    return {'recommendations': recommendations}
