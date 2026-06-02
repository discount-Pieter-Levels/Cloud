import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

export let db: ReturnType<typeof drizzle> | null = null;

if (process.env.DATABASE_URL) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  console.warn(
    "DATABASE_URL is not set. Falling back to in-memory storage for demo mode.",
  );
}
