import { FastifyRequest, FastifyReply } from "fastify";
import * as necessidadeService from "../services/necessidadeService";

export async function renderListaNecessidadesPage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const result = await necessidadeService.listarNecessidadesAbertas();

  if (process.env.NODE_ENV === "test") {
    return reply.send(result);
  }

  return reply.view(
    "/templates/necessidades/lista.hbs",
    {
      user: request.session.user,
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

  return reply.view(
    "/templates/necessidades/nova.hbs",
    {
      user: sessionUser,
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
    return reply.view(
      "/templates/necessidades/nova.hbs",
      {
        user: sessionUser,
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

  return reply.view(
    "/templates/necessidades/detalhe.hbs",
    {
      user: request.session.user,
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

  const result = await necessidadeService.listarNecessidadesDaOng(
    Number(sessionUser.id)
  );

  return reply.view(
    "/templates/necessidades/minhas.hbs",
    {
      user: sessionUser,
      necessidades: result.necessidades,
      success: (request.query as any)?.sucesso === "1",
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