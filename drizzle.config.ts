import { defineConfig } from "drizzle-kit";

const connectionString = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("SUPABASE_DATABASE_URL (o DATABASE_URL) es requerido para ejecutar comandos de Drizzle");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/supabase",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
  migrations: {
    table: "petflow_drizzle_migrations",
    schema: "public",
  },
});
