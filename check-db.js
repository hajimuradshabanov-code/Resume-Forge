require("dotenv/config");
const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  const result = await client.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
  );

  for (const row of result.rows) {
    console.log(row.tablename);
  }

  await client.end();
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});