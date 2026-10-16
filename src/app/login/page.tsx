export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "80px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase", color: "#f5a93b" }}>Social event picker</div>
      <h1 style={{ fontSize: 44, lineHeight: 1, fontWeight: 800, letterSpacing: "-.02em" }}>TEG Social Event Picker</h1>
      <form method="POST" action="/api/login" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", background: "#123540", border: "1.5px dashed #6fa3a6", borderRadius: 18, padding: "20px 24px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#b9d3d2", flex: "1 1 200px" }}>
          Password
          <input type="password" name="password" autoFocus required style={{ font: "inherit", fontSize: 16, padding: "0 10px", minHeight: 44, borderRadius: 10, border: "1.5px solid #6fa3a6", background: "#0d2830", color: "#eaf4f2" }} />
        </label>
        <button type="submit" style={{ minHeight: 44, padding: "0 24px", borderRadius: 14, border: 0, background: "#f5a93b", color: "#1a1200", fontWeight: 800, fontSize: 16 }}>
          Enter
        </button>
      </form>
      {error && <p role="alert" style={{ color: "#ffb4a0" }}>That password didn&apos;t work.</p>}
    </main>
  );
}
