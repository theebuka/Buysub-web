export default function Navbar() {
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
        </div>
      </div>
    )
  }