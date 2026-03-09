import { FastifyReply, FastifyRequest } from "fastify";

export async function ensureUser(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.session.user;

  if (!user) {
    return reply.redirect("/login");
  }

  if (user.tipo !== "usuario") {
    return reply.redirect("/dashboard/ong");
  }
}