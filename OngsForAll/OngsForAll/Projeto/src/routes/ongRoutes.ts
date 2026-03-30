import { FastifyInstance } from "fastify";
import { renderOngsPage } from "../controllers/ongController";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";

export async function ongRoutes(fastify: FastifyInstance) {
  fastify.get("/ongs", { preHandler: ensureAuthenticated }, renderOngsPage);
}
