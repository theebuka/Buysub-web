import { useState, useMemo } from 'react'

// ── theme tokens ─────────────────────────────────────────────────
const T_DARK = {
  bg: '#050507', card: '#0B0B0F', border: '#1c1c22',
  input: '#0a0a0c', inputBorder: '#27272e',
  text: '#e8e8ec', muted: '#a0a0b0', faint: '#6b6b7e',
  elevated: '#111115', panelBorder: 'rgba(255,255,255,0.05)',
}
const T_LIGHT = {
  bg: '#f0f0f5', card: '#ffffff', border: '#e5e5ea',
  input: '#f5f5f7', inputBorder: '#d1d1d6',
  text: '#1a1a22', muted: '#6e6e78', faint: '#9e9ea8',
  elevated: '#f7f7fa', panelBorder: 'rgba(0,0,0,0.06)',
}

export default function Navbar() {
  const [isDark,    setIsDark]    = useState(true)
  const toggleTheme = () => {
    const next = !isDark; setIsDark(next)
    try { localStorage.setItem('bs_admin_theme', next ? 'dark' : 'light') } catch {}
  }

  const T = useMemo(() => isDark ? T_DARK : T_LIGHT, [isDark])

    return (
      <div
        style={{
          height: 64,
          borderBottom: "1px solid var(--bs-border-default)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          background: "var(--bs-bg-primary)",
          position: "sticky",
          top: 0,
          zIndex: 50
        }}
      >
        {/* Logo */}
        <a href="/shop" style={{ fontWeight: 700, fontSize: 18 }}>
          BuySub
        </a>
  
        {/* Right side */}
        <div style={{ display: "flex", gap: 16 }}>
          <a href="/shop">Shop</a>
          <a href="/partners">Partners</a>
          <a href="/admin">Admin</a>
          {/* Theme toggle */}
          <button
            className="bs-theme-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            style={{
              position: 'fixed', top: 20, right: 20,
              width: 38, height: 38, borderRadius: 10,
              background: T.card, border: `1px solid ${T.border}`,
              color: T.muted, cursor: 'pointer', fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10, transition: 'border-color .15s',
            }}
          >
            {isDark ? '☀' : '☾'}
          </button>
        </div>
      </div>
    )
  }