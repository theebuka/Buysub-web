import type { Brand } from './brands'

const SNAPCHAT = 'Snapchat'

/** A brand's Simple Icons glyph: white, except Snapchat, whose mark is a white ghost with a black outline. */
export default function BrandGlyph({ b }: { b: Brand }) {
  const snap = b.name === SNAPCHAT
  return (
    <svg viewBox="-1 -1 26 26" aria-hidden="true">
      <path d={b.path} fill="currentColor" {...(snap ? { stroke: '#000', strokeWidth: 1.1, paintOrder: 'stroke', strokeLinejoin: 'round' as const } : {})} />
    </svg>
  )
}
