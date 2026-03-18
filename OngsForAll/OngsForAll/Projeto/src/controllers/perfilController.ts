import { FastifyRequest, FastifyReply } from "fastify";
import * as perfilService from "../services/perfilService";

function getLayout(tipo: string) {
  return tipo === "ong" ? "layouts/ongDashboardLayout" : "layouts/dashboardLayout";
}

function getBackUrl(tipo: string) {
  return tipo === "ong" ? "/dashboard/ong" : "/dashboard";
}

export async function renderPerfilPage(request: FastifyRequest, reply: FastifyReply) {
  const session = request.session.user;
  if (!session) return reply.redirect("/login");

  const isOng = session.tipo === "ong";
  const result = isOng
    ? await perfilService.getOngProfile(Number(session.id))
    : await perfilService.getUserProfile(Number(session.id));

  if (!result.ok) return reply.status(404).send({ message: "Perfil não encontrado" });

  return reply.view("/templates/perfil.hbs", {
    user: result.user,
    isOng,
    backUrl: getBackUrl(session.tipo),
    success: (request.query as any)?.success === "1",
  }, { layout: getLayout(session.tipo) });
}

export async function updatePerfil(request: FastifyRequest, reply: FastifyReply) {
  const session = request.session.user;
  if (!session) return reply.redirect("/login");

  const isOng = session.tipo === "ong";
  const userId = Number(session.id);

  const { nome, email, telefone, password, area_atuacao } = request.body as {
    nome: string;
    email: string;
    telefone?: string;
    password?: string;
    area_atuacao?: string;
  };

  try {
    const result = isOng
      ? await perfilService.updateOngProfile({
          ongId: userId,
          nome,
          email,
          telefone,
          areaAtuacao: area_atuacao,
          password,
        })
      : await perfilService.updateProfile({
          userId,
          nome,
          email,
          telefone,
          password,
        });

    if (!result.ok) {
      const current = isOng
        ? await perfilService.getOngProfile(userId)
        : await perfilService.getUserProfile(userId);

      return reply.view("/templates/perfil.hbs", {
        user: current.ok ? current.user : { id: userId, nome, email },
        isOng,
        backUrl: getBackUrl(session.tipo),
        message: result.error,
      }, { layout: getLayout(session.tipo) });
    }

    request.session.user = {
      ...session,
      id: userId,
      nome,
      email,
    };

    return reply.redirect("/perfil/editar?success=1");
  } catch (error: any) {
    console.error("Erro ao atualizar perfil:", error);

    const current = isOng
      ? await perfilService.getOngProfile(userId)
      : await perfilService.getUserProfile(userId);

    return reply.view("/templates/perfil.hbs", {
      user: current.ok ? current.user : { id: userId, nome, email },
      isOng,
      backUrl: getBackUrl(session.tipo),
      message: "Erro ao atualizar perfil",
    }, { layout: getLayout(session.tipo) });
  }
}
