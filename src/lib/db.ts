import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function makePool() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return new Pool({
    connectionString: url,
    max: 5,
    ssl: url.includes("railway.internal") ? false : { rejectUnauthorized: false },
  });
}

export function getPool(): Pool | null {
  if (!global.__pgPool) global.__pgPool = makePool() ?? undefined;
  return global.__pgPool ?? null;
}
