import Fastify from 'fastify';
import { ping } from '@spoke/shared';
import { env } from './env';

const app = Fastify({ logger: true });

app.get('/health', async () => ({ status: 'ok', shared: ping() }));

app.listen({ port: env.PORT }).catch((error: unknown) => {
  app.log.error(error);
  process.exit(1);
});
