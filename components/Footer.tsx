export default function Footer() {
    return (
      <div
        style={{
          marginTop: 40,
          padding: "24px",
          borderTop: "1px solid var(--bs-border-default)",
          fontSize: 13,
          color: "var(--bs-text-secondary)",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12
        }}
      >
        <div>© {new Date().getFullYear()} BuySub</div>
  
        <div style={{ display: "flex", gap: 16 }}>
          <a href="https://buysub.ng">Main site</a>
          <a href="https://buysub.ng/privacy">Privacy</a>
          <a href="https://buysub.ng/faqs">FAQs</a>
        </div>
      </div>
    )
  }