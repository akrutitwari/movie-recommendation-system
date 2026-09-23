import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Production notes — CineMatch",
  description:
    "How CineMatch turns a handful of favourites into ten credited recommendations, and what the score does and does not mean.",
};

const steps: [string, string[]][] = [
  [
    "Metadata",
    [
      "Movie and series records are combined into one catalog on title and genre, so both kinds of title share a feature space. TVmaze's Science-Fiction is mapped onto Sci-Fi so the two sources agree on one term. Every title keeps a stable id.",
      "Ratings are not used. Posters and synopses are display information only — they never reach the model.",
    ],
  ],
  [
    "Text preparation",
    [
      "Release years come off titles, text is lowercased, punctuation is cleaned. Sci-Fi becomes scifi so it survives as a single term rather than splitting in two.",
      "Each genre is repeated three times, which gives genre overlap more weight than an incidental word that happens to appear in a title.",
    ],
  ],
  [
    "Vectorisation",
    [
      "A TF-IDF vectoriser learns its vocabulary from the whole catalog. Every title becomes a row of weighted numbers, one column per term. Common terms get low inverse-document-frequency weights; distinctive ones get high weights. Rows are normalised to unit length.",
    ],
  ],
  [
    "Your taste vector",
    [
      "Your chosen titles are averaged so each gets an equal vote. A term that recurs across your picks ends up larger in the profile than one that appears once.",
    ],
  ],
  [
    "Cosine similarity",
    [
      "The profile is compared against every title in the catalog by the angle between them. Near one means they point the same way. Zero means they share no weighted terms.",
      "The percentage on each credit is that cosine multiplied by a hundred. It is a measure of shared content — not a probability that you will enjoy the film.",
    ],
  ],
  [
    "The billing",
    [
      "Your own picks are excluded, the rest are sorted high to low, and up to ten positive matches are returned. Ties resolve by id. Each credit carries the titles it was drawn from and the individual term contributions that produced the score.",
    ],
  ],
];

// A recorded run, reproduced verbatim from docs/EVALUATION.md.
const run: [string, string, string][] = [
  ["Strange Days", "1995", "0.698319"],
  ["The One", "2001", "0.687250"],
  ["Next", "2007", "0.687250"],
];

export default function ProductionNotes() {
  return (
    <main id="main" className="notes">
      <h1>
        Production
        <em>notes</em>
      </h1>
      <p className="notes-lede">
        No oracle, no black box. Six steps turn the titles you name into a
        ranked list, and every number on the results page comes from the last
        two of them.
      </p>

      {steps.map(([title, paras], index) => (
        <section className="step" key={title}>
          <i>{String(index + 1).padStart(2, "0")}</i>
          <div>
            <h2>{title}</h2>
            {paras.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>
        </section>
      ))}

      <section className="step">
        <i>Ex</i>
        <div>
          <h2>A recorded run</h2>
          <p>
            Favourites: <strong>Interstellar</strong> and{" "}
            <strong>Inception</strong>. The three strongest results, reproduced
            from the project&rsquo;s own evaluation output.
          </p>
          <table className="ledger">
            <caption>Top three by cosine similarity</caption>
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Year</th>
                <th scope="col" className="num">
                  Cosine
                </th>
              </tr>
            </thead>
            <tbody>
              {run.map(([title, year, score]) => (
                <tr key={title}>
                  <td>{title}</td>
                  <td>{year}</td>
                  <td className="num">{score}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Strange Days scored on scifi (0.291), mystery (0.143), crime
            (0.094), action (0.070), thriller (0.068) and drama (0.032). Those
            six contributions are what the results page sets as type.
          </p>
        </div>
      </section>

      <section className="step">
        <i>Fix</i>
        <div>
          <h2>What inspection changed</h2>
          <p>
            An early version treated IMAX as a genre. Because it is rare, its
            inverse-document-frequency weight was high, and it quietly
            dominated matches between blockbusters — titles were being
            recommended to each other for sharing a projection format rather
            than anything about the story. Presentation formats were excluded
            from the feature set.
          </p>
          <p>
            That was a judgement made by reading output, not a statistically
            validated improvement, and it is recorded here as such.
          </p>
        </div>
      </section>

      <p className="caveat">
        <strong>What is not claimed.</strong> No held-out precision, recall or
        accuracy is reported for this system. Genre overlap is a circular
        sanity check, because genres are themselves input features. Title
        vocabulary can privilege sequels and odd lexical matches, and genre
        metadata misses tone, direction and quality. A richer corpus and blind
        human judgements would be the next real quality checks.
      </p>
    </main>
  );
}
