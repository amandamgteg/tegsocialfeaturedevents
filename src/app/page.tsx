import { EventsApp } from "./EventsApp";

export default function Home() {
  return (
    <main>
      <div style={{ position: "relative", height: 230, overflow: "hidden", borderBottom: "3px solid #f5a93b" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero.webp" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 30%" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,#0a1f26f2 0,#0a1f26cc 45%,#0a1f2640 100%)" }} />
        <div style={{ position: "relative", maxWidth: 1312, margin: "0 auto", padding: "0 24px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase", color: "#f5a93b" }}>Social event picker</div>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 60px)", lineHeight: 1, fontWeight: 800, letterSpacing: "-.02em" }}>Toronto Event Generator</h1>
          <p style={{ fontSize: 18, color: "#cfe3e1" }}>Find starred events, pick by picture, take the images home.</p>
        </div>
      </div>
      <EventsApp />
    </main>
  );
}
