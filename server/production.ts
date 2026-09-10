import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const currentFile = fileURLToPath(import.meta.url);
const publicDir = path.join(path.dirname(currentFile), "public");

app.disable("x-powered-by");
app.get("/api/health", (_request, response) => {
  response.status(200).json({ ok: true, service: "petflow", timestamp: new Date().toISOString() });
});
app.use(express.static(publicDir, { index: "index.html" }));

// SPA fallback: Supabase redirects and client-side routes must load index.html.
app.get("*", (_request, response) => {
  response.sendFile(path.join(publicDir, "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`PetFlow production server listening on port ${port}`);
});
