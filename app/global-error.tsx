"use client";

export default function GlobalError() {
  return (
    <html lang="es">
      <body style={{ alignItems: "center", background: "#f7f5ef", color: "#163d33", display: "flex", fontFamily: "Arial, sans-serif", justifyContent: "center", margin: 0, minHeight: "100vh", padding: 24 }}>
        <main style={{ maxWidth: 420, textAlign: "center" }}>
          <p style={{ color: "#8d6d32", fontSize: 12, fontWeight: 700, letterSpacing: ".1em" }}>PETFLOW</p>
          <h1 style={{ fontFamily: "Georgia, serif" }}>No pudimos cargar esta pantalla.</h1>
          <p>Actualizá la página o volvé a intentarlo en unos instantes.</p>
        </main>
      </body>
    </html>
  );
}
