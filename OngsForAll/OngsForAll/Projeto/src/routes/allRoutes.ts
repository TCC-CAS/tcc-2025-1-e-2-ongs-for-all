import { FastifyInstance } from 'fastify'
import { authRoutes } from './authRoutes'
import { homeRoutes } from './homeRoutes'
import { dashboardRoutes } from './dashboardRoutes'
import { perfilRoutes } from './perfilRoutes'
import { doacaoRoutes } from './doacaoRoutes'
import { necessidadeRoutes } from "./necessidadeRoutes";
import { interesseDoacaoRoutes } from "./interesseDoacaoRoutes";
import { notificacaoRoutes } from "./notificacaoRoutes";
import { ongRoutes } from "./ongRoutes";

export async function registerAllRoutes(fastify: FastifyInstance) {
  await authRoutes(fastify)
  await homeRoutes(fastify)
  await dashboardRoutes(fastify)
  await perfilRoutes(fastify)
  await doacaoRoutes(fastify)
  await necessidadeRoutes(fastify);
  await interesseDoacaoRoutes(fastify);
  await notificacaoRoutes(fastify);
  await ongRoutes(fastify);
}
