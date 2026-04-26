import { useId } from 'react'

/**
 * Sagemcom brand logo component.
 *
 * Variants:
 *  'full'     – official logo image (ring + "Sagemcom" text), requires light background
 *  'icon'     – SVG ring only, works on any background (dark panels, small sizes)
 *  'wordmark' – gradient text only, used in sidebar next to a standalone icon
 */
function SagemcomLogo({ variant = 'icon', className = '', style, alt = 'Sagemcom', ...props }) {
  const uid = useId().replace(/:/g, '')
  const gId = `sg-grad-${uid}`
  const cls = `sagemcom-logo sagemcom-logo--${variant}${className ? ` ${className}` : ''}`

  // ── full: exact official logo image ──────────────────────────────
  if (variant === 'full') {
    return (
      <img
        src="/sagemcom-logo.png"
        alt={alt}
        className={cls}
        style={{ display: 'block', ...style }}
        {...props}
      />
    )
  }

  // ── SVG ring geometry (for icon / wordmark variants) ─────────────
  const CX = 100, CY = 95
  const R  = 90, r = 50
  const GAP = 37

  const rad = d => (d * Math.PI) / 180
  const pt  = (radius, deg) => [
    CX + radius * Math.cos(rad(deg)),
    CY + radius * Math.sin(rad(deg)),
  ]

  const OR = pt(R, 90 - GAP)
  const OL = pt(R, 90 + GAP)
  const IR = pt(r, 90 - GAP)
  const IL = pt(r, 90 + GAP)
  const CR = (R - r) / 2
  const f  = n => n.toFixed(2)

  const ringPath = [
    `M${f(OR[0])},${f(OR[1])}`,
    `A${R},${R} 0 1,0 ${f(OL[0])},${f(OL[1])}`,
    `A${f(CR)},${f(CR)} 0 0,1 ${f(IL[0])},${f(IL[1])}`,
    `A${r},${r} 0 1,1 ${f(IR[0])},${f(IR[1])}`,
    `A${f(CR)},${f(CR)} 0 0,1 ${f(OR[0])},${f(OR[1])}`,
    'Z',
  ].join(' ')

  const Gradient = () => (
    <defs>
      <linearGradient id={gId} x1="15%" y1="0%" x2="85%" y2="100%">
        <stop offset="0%"   stopColor="#10d4d8" />
        <stop offset="100%" stopColor="#177cf4" />
      </linearGradient>
    </defs>
  )

  // ── icon: SVG ring (safe on dark backgrounds) ─────────────────────
  if (variant === 'icon') {
    return (
      <svg
        viewBox="0 0 200 180"
        className={cls}
        style={style}
        role="img"
        aria-label="Sagemcom"
        {...props}
      >
        <Gradient />
        <path d={ringPath} fill={`url(#${gId})`} />
      </svg>
    )
  }

  // ── wordmark: gradient text (used in sidebar next to icon) ────────
  return (
    <svg
      viewBox="0 0 920 180"
      className={cls}
      style={style}
      role="img"
      aria-label="Sagemcom"
      {...props}
    >
      <Gradient />
      <text
        x="10"
        y="130"
        fill={`url(#${gId})`}
        fontFamily="'Inter', 'Trebuchet MS', 'Segoe UI Rounded', 'Segoe UI', sans-serif"
        fontSize="118"
        fontWeight="700"
        letterSpacing="-5"
      >
        Sagemcom
      </text>
    </svg>
  )
}

export default SagemcomLogo
