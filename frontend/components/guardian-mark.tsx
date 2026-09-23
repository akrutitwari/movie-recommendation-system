/**
 * The CineMatch guardian, reduced to a mark.
 *
 * The full bust in /public/brand/cinematch-guardian.svg carries detail that
 * collapses below ~48px. This is the same idea at glyph scale: the film reel
 * worn as a helm, two perforations reading as eyes, a crest above. Single
 * colour so it survives being knocked out of the lime disc in the header.
 */
export default function GuardianMark({
  size = 24,
  ...props
}: { size?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {/* crest */}
      <path d="M12 0.8 L14.2 3.1 L12 5.2 L9.8 3.1 Z" fill="currentColor" stroke="none" />
      {/* the reel, worn as a helm */}
      <circle cx="12" cy="13" r="8.5" />
      {/* perforations: the lower pair are the eyes */}
      <circle cx="12" cy="9.4" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="8.9" cy="15" r="1.85" fill="currentColor" stroke="none" />
      <circle cx="15.1" cy="15" r="1.85" fill="currentColor" stroke="none" />
    </svg>
  );
}
