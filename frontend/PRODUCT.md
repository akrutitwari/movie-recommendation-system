# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People deciding what to watch next, who can already name a few things they
loved. They arrive with taste but without a candidate, and they are choosing
in a moment of low patience — the decision competes with just reopening
something familiar.

Second audience, confirmed by the owner: people evaluating the owner's
front-end work. The site must read as a portfolio-grade piece of craft *and*
survive being clicked through as a real product. No dead controls, no
placeholder data, no states that only look finished.

## Product Purpose

Turn a handful of titles someone already loves into ten ranked
recommendations, and show its working. Success is a person leaving with
something specific they intend to watch, and understanding why it was
suggested.

## Positioning

Explainability is the mechanism, not a feature bolted on. Each result carries
the titles it was drawn from, the genres it shares, and the individual TF-IDF
terms with their numeric contributions to the cosine score. Most
recommenders present a number; this one shows the arithmetic behind it.

The product is deliberately honest about what the number is not: match is
content similarity, never a predicted rating or a claim about enjoyment.
That disclaimer is a product commitment, not UI copy to be trimmed.

## Operating Context

1. Search the catalog and select up to five favourite titles.
2. Optionally filter output to movies, series, or both.
3. Receive ten ranked results, each with poster, metadata, streaming
   availability, a one-line reason, and an expandable breakdown.

No account, no sign-in, no saved state. A session is a single sitting.

## Capabilities and Constraints

- Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind 4.
- FastAPI + scikit-learn backend: `GET /health`, `GET /titles/search`
  (alias `/movies/search`), `POST /recommend`. The frontend reaches these
  through a `/api/*` rewrite to `BACKEND_URL`, default `127.0.0.1:8000`.
- Recommendation is TF-IDF over content features with cosine similarity.
  Presentation formats such as IMAX were deliberately excluded from features
  after they were found to dominate blockbuster matches.
- The catalog is built by a TMDB pipeline and requires `TMDB_API_KEY`.
  `backend/data/` ships empty, so a fresh clone cannot serve results until
  the catalog is downloaded.
- Selection is capped at five titles; results are capped at ten.
- Search is debounced and abortable; requests time out at 15s.

## Brand Commitments

- Name: **CineMatch**.
- TVmaze attribution (CC BY-SA) and TMDB attribution must remain visible.
- The similarity-is-not-a-rating disclaimer must remain on the results
  surface.
- Guardian mascot and header mark shipped in `public/brand/` and
  `components/guardian-mark.tsx`.

## Evidence on Hand

- `docs/EVALUATION.md` — descriptive sanity checks with worked examples and
  an explicit statement that no held-out precision or recall is claimed.
  **Possibly stale:** it cites a 9,742-title MovieLens catalog, predating the
  move to the live TMDB pipeline. Verify before quoting figures publicly.
- `docs/QA.md`, `docs/DESIGN.md`, `docs/dataset-manifest.json`.
- `notebooks/recommender_exploration.ipynb` with the candidate score
  distribution.
- Original triptych artwork at `public/art/cinematic-triptych.png`.
- Live TMDB poster artwork at runtime.

## Open Decisions

- No imagery can be generated for this project. Any visual drama must come
  from type, colour, light, motion, composition, CSS and SVG, plus the
  existing triptych and live poster art.
- Structure may expand beyond today's two routes (`/`, `/how-it-works`).
