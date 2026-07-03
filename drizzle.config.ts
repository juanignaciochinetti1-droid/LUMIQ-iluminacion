import { defineConfig } from "drizzle-kit";
import path from "path";
import { mkdirSync } from "fs";

const dataDir = path.join(process.cwd(), "data");
mkdirSync(dataDir, { recursive: true });

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: path.join(dataDir, "gestion.db"),
  },
});
