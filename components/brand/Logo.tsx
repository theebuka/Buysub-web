import s from './Logo.module.css'

// BuySub's logo: the brand asset files in public/brand, used as they are.
// combination-mark-tint.svg (#7855FF) in both themes; logomark-tint.svg where
// the full mark doesn't fit.

const RATIO = 258 / 66

/** Logomark and wordmark. `height` sets the size; the width follows the file's ratio. */
export function LogoFull({ height = 28, title = 'BuySub' }: { height?: number; title?: string }) {
  const width = Math.round(height * RATIO * 100) / 100
  return (
    <span className={s.logo} role="img" aria-label={title} style={{ height, width }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/combination-mark-tint.svg" alt="" width={width} height={height} />
    </span>
  )
}

/** The logomark alone, square. */
export function LogoMark({ size = 28, title = 'BuySub' }: { size?: number; title?: string }) {
  return (
    <span className={s.logo} role="img" aria-label={title} style={{ height: size, width: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logomark-tint.svg" alt="" width={size} height={size} />
    </span>
  )
}
