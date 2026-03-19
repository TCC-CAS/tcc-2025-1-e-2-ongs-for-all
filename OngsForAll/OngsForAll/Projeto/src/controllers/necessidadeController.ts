import { FastifyRequest, FastifyReply } from "fastify";
import * as necessidadeService from "../services/necessidadeService";
import * as notificacaoService from "../services/notificacaoService";

async function getNaoLidas(user: { tipo: string; id: number }) {
  const { naoLidas } = await notificacaoService.contarNaoLidas({
    tipoConta: user.tipo,
    id: Number(user.id),
  });
  return naoLidas;
}

export async function renderListaNecessidadesPage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const result = await necessidadeService.listarNecessidadesAbertas();

  if (process.env.NODE_ENV === "test") {
    return reply.send(result);
  }

  const user = request.session.user;
  const naoLidas = user ? await getNaoLidas(user as any) : 0;

  return reply.view(
    "/templates/necessidades/lista.hbs",
    {
      user,
      naoLidas,
      necessidades: result.necessidades,
    },
    { layout: "layouts/dashboardLayout" }
  );
}

export async function renderNovaNecessidadePage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;

  if (!sessionUser) {
    return reply.redirect("/login");
  }

  if (sessionUser.tipo !== "ong") {
    return reply.redirect("/dashboard");
  }

  const naoLidas = await getNaoLidas(sessionUser as any);

  return reply.view(
    "/templates/necessidades/nova.hbs",
    {
      user: sessionUser,
      naoLidas,
    },
    { layout: "layouts/ongDashboardLayout" }
  );
}

export async function criarNecessidade(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;

  if (!sessionUser) {
    return reply.redirect("/login");
  }

  if (sessionUser.tipo !== "ong") {
    return reply.redirect("/dashboard");
  }

  const { titulo, descricao, categoria, quantidade } = request.body as {
    titulo: string;
    descricao: string;
    categoria: string;
    quantidade: string;
  };

  const result = await necessidadeService.criarNecessidade({
    ongId: Number(sessionUser.id),
    titulo,
    descricao,
    categoria,
    quantidade: Number(quantidade),
  });

  if (!result.ok) {
    const naoLidas = await getNaoLidas(sessionUser as any);

    return reply.view(
      "/templates/necessidades/nova.hbs",
      {
        user: sessionUser,
        naoLidas,
        error: result.error,
        form: { titulo, descricao, categoria, quantidade },
      },
      { layout: "layouts/ongDashboardLayout" }
    );
  }

  return reply.redirect("/ong/necessidades?sucesso=1");
}

export async function renderDetalheNecessidadePage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };

  const result = await necessidadeService.buscarNecessidadePorId(Number(id));

  if (!result.ok) {
    return reply.status(404).send({ message: result.error });
  }

  const user = request.session.user;
  const naoLidas = user ? await getNaoLidas(user as any) : 0;

  return reply.view(
    "/templates/necessidades/detalhe.hbs",
    {
      user,
      naoLidas,
      necessidade: result.necessidade,
    },
    { layout: "layouts/dashboardLayout" }
  );
}

export async function renderNecessidadesOngPage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;

  if (!sessionUser) {
    return reply.redirect("/login");
  }

  if (sessionUser.tipo !== "ong") {
    return reply.redirect("/dashboard");
  }

  const { status, sucesso } = request.query as { status?: string; sucesso?: string };

  const result = await necessidadeService.listarNecessidadesDaOng(
    Number(sessionUser.id),
    status
  );

  const naoLidas = await getNaoLidas(sessionUser as any);

  return reply.view(
    "/templates/necessidades/minhas.hbs",
    {
      user: sessionUser,
      naoLidas,
      necessidades: result.necessidades,
      filtroAtual: result.filtroAtual,
      success: sucesso === "1",
    },
    { layout: "layouts/ongDashboardLayout" }
  );
}

export async function alterarStatusNecessidade(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;

  if (!sessionUser) {
    return reply.redirect("/login");
  }

  if (sessionUser.tipo !== "ong") {
    return reply.redirect("/dashboard");
  }

  const { id } = request.params as { id: string };
  const { status } = request.body as { status: string };

  const result = await necessidadeService.alterarStatusNecessidade({
    id: Number(id),
    ongId: Number(sessionUser.id),
    status,
  });

  if (!result.ok) {
    return reply.status(400).send({ message: result.error });
  }

  return reply.redirect("/ong/necessidades");
}