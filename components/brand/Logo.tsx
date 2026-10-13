import s from './Logo.module.css'

// BuySub's logo: the brand asset files in public/brand, used as they are.
// combination-mark-tint.svg (#7855FF) in both themes; logomark-tint.svg where
// the full mark doesn't fit.
// `tone="white"` is for a violet ground (the header on the partner programme
// page): combination-mark-white.svg is the tint file with its fills swapped,
// and logomark-white.svg is the brand's own white mark.

type Tone = 'tint' | 'white'

const RATIO = 258 / 66

/** Logomark and wordmark. `height` sets the size; the width follows the file's ratio. */
export function LogoFull({ height = 28, title = 'BuySub', tone = 'tint' }: { height?: number; title?: string; tone?: Tone }) {
  const width = Math.round(height * RATIO * 100) / 100
  return (
    <span className={s.logo} role="img" aria-label={title} style={{ height, width }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/brand/combination-mark-${tone}.svg`} alt="" width={width} height={height} />
    </span>
  )
}

/** The logomark alone, square. */
export function LogoMark({ size = 28, title = 'BuySub', tone = 'tint' }: { size?: number; title?: string; tone?: Tone }) {
  return (
    <span className={s.logo} role="img" aria-label={title} style={{ height: size, width: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/brand/logomark-${tone}.svg`} alt="" width={size} height={size} />
    </span>
  )
}
