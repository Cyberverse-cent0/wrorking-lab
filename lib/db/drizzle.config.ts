import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Use SQLite for development, PostgreSQL for production
const isSQLite = process.env.DATABASE_URL.startsWith("sqlite:") || process.env.DATABASE_URL.startsWith("file:");

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: isSQLite ? "sqlite" : "postgresql",
  dbCredentials: isSQLite 
    ? { url: process.env.DATABASE_URL }
    : { url: process.env.DATABASE_URL },
});
