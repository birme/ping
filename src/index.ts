import { setupDatabase } from "@osaas/client-db";
import fastify from "fastify";
import postgres from "postgres";

async function main() {
  const server = fastify();
  const dbName = process.env.DB_NAME || 'sitemonitor';
  const dbUser = process.env.DB_USER || 'sitemonitor';
  const dbPassword = process.env.DB_PASSWORD || 'sitemonitor';

  const dbUrl = await setupDatabase('postgres', dbName, {
    username: dbUser,
    password: dbPassword,
    database: dbName,
  });  
  const sql = postgres(new URL(dbName, dbUrl).toString());
  await sql`CREATE TABLE IF NOT EXISTS checks (id BIGSERIAL PRIMARY KEY, site TEXT NOT NULL, up BOOLEAN NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW())`;

  server.get('/', async (request, reply) => {
    reply.send('Hello World');
  });

  server.get<{
    Params: { site: string };
    Reply: {
      200: { up: boolean };
      '4xx': { error: string };
    }
  }>('/ping/:site', async (request, reply) => {
    const url = `https://${request.params.site}`;
    try {
      const response = await fetch(url, { method: 'GET' });
      const isUp = response.status >= 200 && response.status < 400;
      await sql`INSERT INTO checks (site, up) VALUES (${url}, ${isUp})`;
      reply.code(200).send({ up: isUp });
    } catch (err) {
      await sql`INSERT INTO checks (site, up) VALUES (${url}, false)`;
      reply.code(200).send({ up: false });
    }
  });

  server.listen({ host: '0.0.0.0', port: process.env.PORT ? Number(process.env.PORT) : 8080 }, (err, address) => {
    if (err) console.error(err);
    console.log(`Server listening at ${address}`);
  });
}

main();
