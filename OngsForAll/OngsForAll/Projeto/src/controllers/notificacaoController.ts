import { FastifyRequest, FastifyReply } from "fastify";
import * as notificacaoService from "../services/notificacaoService";

export async function renderNotificacoesPage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;

  if (!sessionUser) {
    return reply.redirect("/login");
  }

  try {
    const { notificacoes, naoLidas } = await notificacaoService.listarNotificacoes({
      tipoConta: sessionUser.tipo,
      id: Number(sessionUser.id),
    });

    if (process.env.NODE_ENV === "test") {
      return reply.send({
        user: sessionUser,
        notificacoes,
        naoLidas,
      });
    }

    const layout =
      sessionUser.tipo === "ong"
        ? "layouts/ongDashboardLayout"
        : "layouts/dashboardLayout";

    return reply.view(
      "/templates/notificacoes/notificacoes.hbs",
      {
        user: sessionUser,
        notificacoes,
        naoLidas,
      },
      { layout }
    );
  } catch (error) {
    console.error("Erro ao carregar notificações:", error);
    return reply.code(500).send("Erro ao carregar notificações.");
  }
}

export async function marcarNotificacaoComoLida(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;

  if (!sessionUser) {
    return reply.redirect("/login");
  }

  const { id } = request.params as { id: string };

  try {
    await notificacaoService.marcarComoLida(Number(id));
    return reply.redirect("/notificacoes");
  } catch (error) {
    console.error("Erro ao marcar notificação como lida:", error);
    return reply.code(500).send("Erro ao atualizar notificação.");
  }
}