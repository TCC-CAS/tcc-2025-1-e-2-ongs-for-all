import { FastifyRequest, FastifyReply } from "fastify";
import * as perfilService from "../services/perfilService";

export async function renderPerfilPage(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.session.user?.id;
  if (!userId) return reply.redirect("/login");

  const result = await perfilService.getUserProfile(Number(userId));
  if (!result.ok) return reply.status(404).send({ message: "Usuário não encontrado" });

  return reply.view("/templates/editarPerfil.hbs", {
    user: result.user,
    success: (request.query as any)?.success === "1",
  }, { layout: "layouts/perfilLayout" });
}

export async function updatePerfil(request: FastifyRequest, reply: FastifyReply) {
  const sessionUserId = request.session.user?.id;
  if (!sessionUserId) return reply.redirect("/login");

  const { id, nome, email, password } = request.body as {
    id: string;
    nome: string;
    email: string;
    password?: string;
  };

  // Segurança: ignora o "id" vindo do form e usa o da sessão
  const userId = Number(sessionUserId);

  try {
    const result = await perfilService.updateProfile({
      userId,
      nome,
      email,
      password,
    });

    if (!result.ok) {
      const current = await perfilService.getUserProfile(userId);
      return reply.view("/templates/editarPerfil.hbs", {
        user: current.ok ? current.user : { id: userId, nome, email },
        message: result.error, // mantém o seu {{#if message}}
      }, { layout: "layouts/perfilLayout" });
    }

    // Atualiza a sessão para refletir o novo nome/email no sistema
    request.session.user = {
      ...request.session.user,
      id: userId,
      nome,
      email,
    };

    // ✅ redirect correto (pra não dar 404)
    return reply.redirect("/perfil/editar?success=1");
  } catch (error: any) {
    console.error("Erro ao atualizar perfil:", error);

    const current = await perfilService.getUserProfile(userId);
    return reply.view("/templates/editarPerfil.hbs", {
      user: current.ok ? current.user : { id: userId, nome, email },
      message: "Erro ao atualizar perfil",
    }, { layout: "layouts/perfilLayout" });
  }
}