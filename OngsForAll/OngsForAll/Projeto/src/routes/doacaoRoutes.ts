import { FastifyInstance } from "fastify";
import {
  renderNovaDoacaoPage,
  criarDoacao,
  listarHistoricoDoacoes,
} from "../controllers/doacaoController";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";
import { ensureUser } from "../middlewares/ensureUser";

export async function doacaoRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/doacoes/nova",
    { preHandler: [ensureAuthenticated, ensureUser] },
    renderNovaDoacaoPage
  );

  fastify.post(
    "/doacoes",
    { preHandler: [ensureAuthenticated, ensureUser] },
    criarDoacao
  );

  fastify.get(
    "/doacoes",
    { preHandler: [ensureAuthenticated, ensureUser] },
    listarHistoricoDoacoes
  );
}