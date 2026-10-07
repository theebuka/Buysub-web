import s from './Logo.module.css'

// BuySub's logo: the brand asset files in public/brand, used as they are.
// combination-mark-brand.svg (#5340FE) on light, combination-mark-tint.svg
// (#7855FF) on dark; CSS shows the one for the current theme.

const RATIO = 258 / 66

/** Logomark and wordmark. `height` sets the size; the width follows the file's ratio. */
export function LogoFull({ height = 28, title = 'BuySub' }: { height?: number; title?: string }) {
  const width = Math.round(height * RATIO * 100) / 100
  return (
    <span className={s.logo} role="img" aria-label={title} style={{ height, width }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={s.onDark} src="/brand/combination-mark-tint.svg" alt="" width={width} height={height} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={s.onLight} src="/brand/combination-mark-brand.svg" alt="" width={width} height={height} />
    </span>
  )
}
