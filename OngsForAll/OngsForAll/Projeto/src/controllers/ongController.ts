import { FastifyRequest, FastifyReply } from "fastify";
import * as ongService from "../services/ongService";
import * as notificacaoService from "../services/notificacaoService";

export async function renderOngsPage(request: FastifyRequest, reply: FastifyReply) {
  const session = request.session.user;
  if (!session) return reply.redirect("/login");

  const { busca } = request.query as { busca?: string };
  const ongs = await ongService.listOngs(busca);

  const { naoLidas } = await notificacaoService.contarNaoLidas({
    tipoConta: session.tipo,
    id: Number(session.id),
  });

  const layout = session.tipo === "ong"
    ? "layouts/ongDashboardLayout"
    : "layouts/dashboardLayout";

  return reply.view("/templates/ongs.hbs", {
    title: "Explorar ONGs",
    ongs,
    busca: busca || "",
    totalOngs: ongs.length,
    user: session,
    naoLidas,
  }, { layout });
}
