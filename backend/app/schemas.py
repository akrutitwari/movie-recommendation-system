from typing import Annotated, Literal
from pydantic import BaseModel, Field, ConfigDict, StrictInt

class Movie(BaseModel):
    id: int
    media_type: Literal["movie", "series"] = "movie"
    source_url: str | None = None
    platforms: list[str] = []
    title: str
    year: int | None
    genres: list[str]
    poster_url: str | None = None
    overview: str | None = None

class Feature(BaseModel):
    term: str
    contribution: float

class Recommendation(Movie):
    score: float = Field(ge=0, le=1)
    content_score: float = Field(ge=0, le=1)
    shared_genres: list[str]
    shared_features: list[Feature]
    reasons: list[str]
    explanation: str
    selected_titles: list[str]

class RecommendRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    media_type: Literal["all", "movie", "series"] = "all"
    movie_ids: list[Annotated[StrictInt, Field(gt=0)]] = Field(min_length=1, max_length=5)
    limit: Annotated[StrictInt, Field(ge=1, le=20)] = 10

class RecommendResponse(BaseModel):
    recommendations: list[Recommendation]
    model: str = 'Content similarity (TF-IDF + cosine) blended with popularity/recency'

class Health(BaseModel):
    status: str
    movies: int
    series: int
    titles: int
    features: int
