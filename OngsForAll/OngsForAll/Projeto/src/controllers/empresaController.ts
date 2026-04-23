import { FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import * as empresaService from "../services/empresaService";
import * as empresaRepo from "../repositories/empresaRepository";
import * as marketplaceRepo from "../repositories/marketplaceRepository";
import path from "path";
import fs from "fs";
import { pipeline } from "stream/promises";

const UPLOADS_DIR = path.join(__dirname, "..", "..", "public", "uploads", "empresa_logos");
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 3 * 1024 * 1024;

async function getNaoLidas(empresaId: number): Promise<number> {
  return marketplaceRepo.contarItensRevisados(empresaId);
}

// ----------------------------------------------------------
// Auth: cadastro
// ----------------------------------------------------------
export async function renderCadastroEmpresaPage(request: FastifyRequest, reply: FastifyReply) {
  return reply.view("/templates/empresa/cadastro.hbs", {}, { layout: "layouts/authLayout" });
}

export async function cadastrarEmpresa(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as Record<string, string>;

  const result = await empresaService.cadastrarEmpresa({
    nome_fantasia: body.nome_fantasia,
    razao_social: body.razao_social,
    email: body.email,
    cnpj: body.cnpj,
    telefone: body.telefone,
    descricao: body.descricao,
    setor: body.setor,
    senha: body.senha,
  });

  if (!result.ok) {
    return reply.view(
      "/templates/empresa/cadastro.hbs",
      { error: result.error, form: body },
      { layout: "layouts/authLayout" }
    );
  }

  return reply.redirect("/login?cadastro=empresa");
}

// ----------------------------------------------------------
// Dashboard
// ----------------------------------------------------------
export async function renderDashboardEmpresa(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  const [data, naoLidas] = await Promise.all([
    empresaService.getDashboardData(Number(sessionUser.id)),
    getNaoLidas(Number(sessionUser.id)),
  ]);

  return reply.view(
    "/templates/empresa/dashboard.hbs",
    { user: sessionUser, naoLidas, ...data },
    { layout: "layouts/empresaDashboardLayout" }
  );
}

// ----------------------------------------------------------
// Apoios — ver necessidades e apoiar
// ----------------------------------------------------------
export async function renderNecessidadesParaApoiar(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  const { tipo } = request.query as { tipo?: string };

  const rows = await empresaRepo.listarNecessidadesAbertas(Number(sessionUser.id), tipo);

  const necessidades = rows.map((n: any) => ({
    ...n,
    ja_apoiou: !!n.ja_apoiou,
    isBem: n.tipo_necessidade === "bem",
    isServico: n.tipo_necessidade === "servico",
    isVoluntariado: n.tipo_necessidade === "voluntariado",
    tipoLabel: n.tipo_necessidade === "bem" ? "Doação" : n.tipo_necessidade === "servico" ? "Serviço" : "Voluntariado",
    progresso: n.quantidade > 0 ? Math.min(100, Math.round((n.quantidade_recebida / n.quantidade) * 100)) : 0,
  }));

  const [empresa, naoLidas] = await Promise.all([
    empresaRepo.findEmpresaById(Number(sessionUser.id)),
    getNaoLidas(Number(sessionUser.id)),
  ]);

  return reply.view(
    "/templates/empresa/necessidades.hbs",
    {
      user: sessionUser,
      naoLidas,
      necessidades,
      filtroTipo: tipo ?? "",
      filtroBem: tipo === "bem",
      filtroServico: tipo === "servico",
      filtroVoluntariado: tipo === "voluntariado",
      statusMarketplace: empresa?.status_marketplace,
    },
    { layout: "layouts/empresaDashboardLayout" }
  );
}

export async function apoiarNecessidade(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  const { id } = request.params as { id: string };
  const { observacao } = request.body as { observacao?: string };

  const ongId = await empresaRepo.findNecessidadeOngId(Number(id));
  if (!ongId) return reply.status(404).send({ message: "Necessidade não encontrada." });

  const result = await empresaService.apoiarNecessidade({
    empresaId: Number(sessionUser.id),
    necessidadeId: Number(id),
    ongId,
    observacao,
  });

  if (!result.ok) {
    return reply.redirect(`/empresa/necessidades?erro=${encodeURIComponent(result.error)}`);
  }

  return reply.redirect("/empresa/necessidades?apoio=1");
}

// ----------------------------------------------------------
// Vitrine da empresa (gestão de itens)
// ----------------------------------------------------------
export async function renderVitrineEmpresa(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  const [empresa, naoLidas] = await Promise.all([
    empresaRepo.findEmpresaById(Number(sessionUser.id)),
    getNaoLidas(Number(sessionUser.id)),
  ]);
  const isBloqueada = empresa?.status_marketplace === "bloqueada";

  const itens = isBloqueada ? [] : await empresaService.listarItensEmpresa(Number(sessionUser.id));

  return reply.view(
    "/templates/empresa/vitrine.hbs",
    {
      user: sessionUser,
      naoLidas,
      empresa,
      itens,
      isBloqueada,
      isElegivel: empresa?.status_marketplace === "elegivel",
      isAtiva: empresa?.status_marketplace === "ativa",
      success: (request.query as any)?.sucesso === "1",
    },
    { layout: "layouts/empresaDashboardLayout" }
  );
}

export async function renderNovoItemPage(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  const empresa = await empresaRepo.findEmpresaById(Number(sessionUser.id));
  if (empresa?.status_marketplace === "bloqueada") return reply.redirect("/empresa/vitrine");

  const [categorias, naoLidas] = await Promise.all([
    marketplaceRepo.getCategorias(),
    getNaoLidas(Number(sessionUser.id)),
  ]);

  return reply.view(
    "/templates/empresa/novo-item.hbs",
    { user: sessionUser, naoLidas, categorias },
    { layout: "layouts/empresaDashboardLayout" }
  );
}

export async function criarItemMarketplace(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  try {
    const data = await request.file();
    let titulo = "", descricao = "", tipo = "produto", categoriaId = "", linkExterno = "";
    let imagemUrl: string | undefined;

    if (data) {
      const fields = data.fields as Record<string, any>;
      titulo = fields.titulo?.value ?? "";
      descricao = fields.descricao?.value ?? "";
      tipo = fields.tipo?.value ?? "produto";
      categoriaId = fields.categoria_id?.value ?? "";
      linkExterno = fields.link_externo?.value ?? "";

      if (data.filename && ALLOWED_MIMES.includes(data.mimetype)) {
        if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        const ext = path.extname(data.filename).toLowerCase() || ".jpg";
        const filename = `item_${Date.now()}${ext}`;
        const filepath = path.join(UPLOADS_DIR, filename);
        await pipeline(data.file, fs.createWriteStream(filepath));
        const stats = fs.statSync(filepath);
        if (stats.size <= MAX_SIZE) {
          imagemUrl = `/public/uploads/empresa_logos/${filename}`;
        } else {
          fs.unlinkSync(filepath);
        }
      }
    } else {
      const body = request.body as any;
      titulo = body.titulo ?? "";
      descricao = body.descricao ?? "";
      tipo = body.tipo ?? "produto";
      categoriaId = body.categoria_id ?? "";
      linkExterno = body.link_externo ?? "";
    }

    const result = await empresaService.criarItemMarketplace({
      empresaId: Number(sessionUser.id),
      titulo,
      descricao,
      tipo,
      categoriaId: categoriaId ? Number(categoriaId) : undefined,
      imagemUrl,
      linkExterno: linkExterno || undefined,
    });

    if (!result.ok) {
      const categorias = await marketplaceRepo.getCategorias();
      return reply.view(
        "/templates/empresa/novo-item.hbs",
        { user: sessionUser, categorias, error: result.error, form: { titulo, descricao, tipo, categoriaId, linkExterno } },
        { layout: "layouts/empresaDashboardLayout" }
      );
    }

    return reply.redirect("/empresa/vitrine?sucesso=1");
  } catch (err) {
    console.error("Erro ao criar item:", err);
    return reply.redirect("/empresa/vitrine");
  }
}

// ----------------------------------------------------------
// Perfil da empresa
// ----------------------------------------------------------
export async function renderPerfilEmpresaPage(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  const [empresa, naoLidas] = await Promise.all([
    empresaRepo.findEmpresaById(Number(sessionUser.id)),
    getNaoLidas(Number(sessionUser.id)),
  ]);

  return reply.view(
    "/templates/empresa/perfil.hbs",
    { user: sessionUser, naoLidas, empresa, success: (request.query as any)?.sucesso === "1" },
    { layout: "layouts/empresaDashboardLayout" }
  );
}

export async function atualizarPerfilEmpresa(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  try {
    const data = await request.file();
    let nome_fantasia = "", razao_social = "", telefone = "", descricao = "", setor = "";
    let logoUrl: string | undefined;

    if (data) {
      const fields = data.fields as Record<string, any>;
      nome_fantasia = fields.nome_fantasia?.value ?? "";
      razao_social = fields.razao_social?.value ?? "";
      telefone = fields.telefone?.value ?? "";
      descricao = fields.descricao?.value ?? "";
      setor = fields.setor?.value ?? "";

      if (data.filename && ALLOWED_MIMES.includes(data.mimetype)) {
        if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        const ext = path.extname(data.filename).toLowerCase() || ".jpg";
        const filename = `empresa_${sessionUser.id}_${Date.now()}${ext}`;
        const filepath = path.join(UPLOADS_DIR, filename);
        await pipeline(data.file, fs.createWriteStream(filepath));
        const stats = fs.statSync(filepath);
        if (stats.size <= MAX_SIZE) {
          logoUrl = `/public/uploads/empresa_logos/${filename}`;
          await empresaRepo.updateEmpresaLogo(Number(sessionUser.id), logoUrl);
          (request.session.user as any).logo = logoUrl;
        } else {
          fs.unlinkSync(filepath);
        }
      }
    } else {
      const body = request.body as any;
      nome_fantasia = body.nome_fantasia ?? "";
      razao_social = body.razao_social ?? "";
      telefone = body.telefone ?? "";
      descricao = body.descricao ?? "";
      setor = body.setor ?? "";
    }

    await empresaRepo.updateEmpresaPerfil(Number(sessionUser.id), { nome_fantasia, razao_social, telefone, descricao, setor });
    (request.session.user as any).nome = nome_fantasia;

    return reply.redirect("/empresa/perfil?sucesso=1");
  } catch (err) {
    console.error("Erro ao atualizar perfil:", err);
    return reply.redirect("/empresa/perfil");
  }
}

// ----------------------------------------------------------
// Notificações
// ----------------------------------------------------------
export async function renderNotificacoesEmpresa(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  const itens = await marketplaceRepo.listarItensComStatus(Number(sessionUser.id));

  // Marca como lidos ao visitar a página (zera o badge)
  await marketplaceRepo.marcarItensComoLidos(Number(sessionUser.id));

  const itensEnrich = itens.map((i: any) => ({
    ...i,
    isAprovado: i.status_publicacao === "aprovado",
    isRejeitado: i.status_publicacao === "rejeitado",
    isPendente: i.status_publicacao === "pendente",
    isRascunho: i.status_publicacao === "rascunho",
    tipoLabel: ({ produto: "Produto", servico: "Serviço", campanha: "Campanha", banner: "Institucional", link: "Link" } as Record<string, string>)[i.tipo] ?? i.tipo,
  }));

  const naoLidas = itensEnrich.filter((i: any) => i.isAprovado || i.isRejeitado).length;

  return reply.view(
    "/templates/empresa/notificacoes.hbs",
    { user: sessionUser, naoLidas, itens: itensEnrich },
    { layout: "layouts/empresaDashboardLayout" }
  );
}
