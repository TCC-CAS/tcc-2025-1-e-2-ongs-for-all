import { FastifyRequest, FastifyReply } from "fastify";
import * as dashboardService from "../services/dashboardService";

// =======================
// DASHBOARD - USUÁRIO
// =======================
export async function renderDashBoardPage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const sessionUser = request.session.user;

    if (!sessionUser) {
      return reply.redirect("/login");
    }

    const data = await dashboardService.getDashboardData(Number(sessionUser.id));
    const totalDoadoNumber = Number(data.totalDoado ?? 0);

    if (process.env.NODE_ENV === "test") {
      return reply.send({ user: sessionUser, ...data });
    }

    return reply.view(
      "/templates/dashboard.hbs",
      {
        user: sessionUser,

        // cards
        totalDoado: totalDoadoNumber.toFixed(2),
        qtdTipos: data.qtdTipos ?? 0,
        qtdMesesComDoacao: data.qtdMesesComDoacao ?? 0,

        // gráficos
        labelsMes: JSON.stringify(data.labelsMes ?? []),
        valoresDoadoMes: JSON.stringify(data.valoresDoadoMes ?? []),
        valoresOngsMes: JSON.stringify(data.valoresOngsMes ?? []),

        labelsTipo: JSON.stringify(data.labelsTipo ?? []),
        valoresTipo: JSON.stringify(data.valoresTipo ?? []),
      },
      { layout: "layouts/dashboardLayout" }
    );
  } catch (error) {
    console.error("Erro ao renderizar dashboard do usuário:", error);
    return reply.status(500).send("Erro ao carregar dashboard do usuário");
  }
}

// =======================
// DASHBOARD - ONG
// =======================
export async function renderDashboardOngPage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const sessionUser = request.session.user;

    if (!sessionUser) {
      return reply.redirect("/login");
    }

    const ongId = Number(sessionUser.id);
    const data = await dashboardService.getOngDashboardData(ongId);

    if (process.env.NODE_ENV === "test") {
      return reply.send({ user: sessionUser, ...data });
    }

    return reply.view(
      "/templates/dashboardOng.hbs",
      {
        user: sessionUser,
        isOng: true,

        // cards
        totalRecebido: Number(data.totalRecebido ?? 0).toFixed(2),
        qtdDoacoes: data.qtdDoacoes ?? 0,
        qtdDoadores: data.qtdDoadores ?? 0,

        // gráficos
        labelsMes: JSON.stringify(data.labelsMes ?? []),
        valoresMes: JSON.stringify(data.valoresMes ?? []),

        labelsTipo: JSON.stringify(data.labelsTipo ?? []),
        valoresTipo: JSON.stringify(data.valoresTipo ?? []),

        // tabela
        ultimasDoacoes: data.ultimasDoacoes ?? [],
      },
      { layout: "layouts/ongDashboardLayout" }
    );
  } catch (error) {
    console.error("Erro ao renderizar dashboard da ONG:", error);
    return reply.status(500).send("Erro ao carregar dashboard da ONG");
  }
}

// =======================
// TOTAL POR ONG
// =======================
export async function totalDoacoesPorOng(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { dados } = await dashboardService.getTotalPorOng();

    if (process.env.NODE_ENV === "test") {
      return reply.send({ dados });
    }

    return reply.view(
      "/templates/totalPorOng.hbs",
      {
        user: request.session.user,
        isOng: true,
        dados,
      },
      { layout: "layouts/ongDashboardLayout" }
    );
  } catch (error) {
    console.error("Erro ao buscar totais das ONGs:", error);
    return reply.status(500).send("Erro ao buscar totais das ONGs");
  }
}