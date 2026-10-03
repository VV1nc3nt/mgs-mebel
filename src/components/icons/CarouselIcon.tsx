// Two overlapping frames: a project with several photos (design: works page previews).
// Drawn for a 16×16 box, stroke in currentColor; the back frame stops where the front one covers it.
export function CarouselIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M6 6V4.5A1.5 1.5 0 0 1 7.5 3h4A1.5 1.5 0 0 1 13 4.5v4a1.5 1.5 0 0 1-1.5 1.5H10" />
      <rect x="3" y="6" width="7" height="7" rx="1.5" />
    </svg>
  )
}
