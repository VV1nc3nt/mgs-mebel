import Link from 'next/link'

/**
 * Text logo (README §3): «MGS» with an accent «S», «MEBEL» spaced out below. The official SVG
 * replaces it here, in one place (README §10).
 */
export function Logo() {
  return (
    <Link
      href="/"
      aria-label="MGS MEBEL — на главную"
      className="flex flex-col items-center gap-0.75"
    >
      <span aria-hidden="true" className="text-logo text-text">
        MG<span className="text-accent">S</span>
      </span>
      {/* The negative margin cancels the letter-spacing after the last letter, so it stays centred */}
      <span aria-hidden="true" className="-mr-[0.7em] text-logo-sub text-text-2">
        MEBEL
      </span>
    </Link>
  )
}
