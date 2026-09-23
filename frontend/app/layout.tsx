import type { Metadata } from "next";
import { Big_Shoulders, Archivo } from "next/font/google";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import GuardianMark from "@/components/guardian-mark";
import "./globals.css";

// Billing: an ultra-condensed grotesque, the face a credits slab is set in.
// Text: a normal-width grotesque. The pairing contrasts on width, the way a
// one-sheet's title treatment contrasts with its body copy.
const billing = Big_Shoulders({
  subsets: ["latin"],
  variable: "--font-billing",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});
const text = Archivo({
  subsets: ["latin"],
  variable: "--font-text",
  display: "swap",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "CineMatch — Find your next favorite watch",
  description:
    "A thoughtful movie discovery experience powered by explainable content-based recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${billing.variable} ${text.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <header className="site-header">
          <Link href="/" className="brand">
            <GuardianMark size={30} />
            <span>CineMatch</span>
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/">Discover</Link>
            <Link href="/how-it-works">
              Production notes <ArrowUpRight size={13} />
            </Link>
          </nav>
        </header>
        {children}
        <footer>
          <Link href="/" className="footer-brand">
            CineMatch
          </Link>
          <span>Content-based recommendations · TF-IDF &amp; cosine similarity</span>
          <a href="https://www.themoviedb.org/">Catalog &amp; artwork: TMDB</a>
          <a href="https://www.tvmaze.com/api#licensing">
            Series data: TVmaze · CC BY-SA
          </a>
        </footer>
      </body>
    </html>
  );
}
