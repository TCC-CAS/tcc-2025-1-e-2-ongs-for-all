import bcrypt from "bcryptjs";
import { z } from "zod";
import * as empresaRepo from "../repositories/empresaRepository";
import * as marketplaceRepo from "../repositories/marketplaceRepository";

const cadastroSchema = z.object({
  nome_fantasia: z.string().min(2, "Nome fantasia obrigatório"),
  razao_social: z.string().optional(),
  email: z.string().email("Email inválido"),
  cnpj: z.string().min(14, "CNPJ inválido").max(18),
  telefone: z.string().min(8).optional(),
  descricao: z.string().optional(),
  setor: z.string().optional(),
  senha: z.string().min(6, "Senha mínima de 6 caracteres"),
});

export async function cadastrarEmpresa(body: Record<string, string>) {
  const parsed = cadastroSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0].message };
  }

  const { senha, ...dados } = parsed.data;
  const senhaHash = await bcrypt.hash(senha, 10);

  try {
    await empresaRepo.createEmpresa({ ...dados, senhaHash });
    return { ok: true as const };
  } catch (err: any) {
    if (err?.code === "ER_DUP_ENTRY") {
      return { ok: false as const, error: "Email ou CNPJ já cadastrado." };
    }
    throw err;
  }
}

export async function getDashboardData(empresaId: number) {
  const [empresa, metricas, apoios] = await Promise.all([
    empresaRepo.findEmpresaById(empresaId),
    empresaRepo.getMetricas(empresaId),
    empresaRepo.listarApoiosDaEmpresa(empresaId),
  ]);

  const isBloqueada = empresa.status_marketplace === "bloqueada";
  const isElegivel = empresa.status_marketplace === "elegivel";
  const isAtiva = empresa.status_marketplace === "ativa";
  const podePubilcar = isElegivel || isAtiva;

  // Calcular progresso para elegibilidade (meta: 3 apoios)
  const META_APOIOS = 3;
  const progressoMeta = Math.min(100, Math.round((Number(metricas.total_apoios) / META_APOIOS) * 100));
  const faltam = Math.max(0, META_APOIOS - Number(metricas.total_apoios));

  return {
    empresa,
    metricas: {
      total_apoios: Number(metricas.total_apoios),
      ongs_apoiadas: Number(metricas.ongs_apoiadas),
      tipos_apoiados: Number(metricas.tipos_apoiados),
    },
    apoiosRecentes: apoios.slice(0, 5),
    isBloqueada,
    isElegivel,
    isAtiva,
    podePubilcar,
    progressoMeta,
    faltam,
    META_APOIOS,
  };
}

export async function apoiarNecessidade(params: {
  empresaId: number;
  necessidadeId: number;
  ongId: number;
  observacao?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const jaApoiou = await empresaRepo.jaApoiou(params.empresaId, params.necessidadeId);
  if (jaApoiou) return { ok: false, error: "Sua empresa já apoiou esta necessidade." };

  await empresaRepo.createApoio(params);
  // Verifica elegibilidade automaticamente
  await empresaRepo.verificarElegibilidade(params.empresaId);

  return { ok: true };
}

export async function criarItemMarketplace(params: {
  empresaId: number;
  titulo: string;
  descricao: string;
  tipo: string;
  categoriaId?: number;
  imagemUrl?: string;
  linkExterno?: string;
}): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const empresa = await empresaRepo.findEmpresaById(params.empresaId);
  if (!empresa) return { ok: false, error: "Empresa não encontrada." };

  if (empresa.status_marketplace === "bloqueada") {
    return { ok: false, error: "Sua empresa precisa apoiar pelo menos 3 necessidades para publicar na vitrine." };
  }

  const titulo = params.titulo.trim();
  const descricao = params.descricao.trim();

  if (titulo.length < 3) return { ok: false, error: "Título deve ter ao menos 3 caracteres." };
  if (descricao.length < 10) return { ok: false, error: "Descrição deve ter ao menos 10 caracteres." };

  const tipo = ["produto", "servico", "campanha", "banner", "link"].includes(params.tipo)
    ? params.tipo
    : "produto";

  const id = await marketplaceRepo.createItem({
    empresaId: params.empresaId,
    titulo,
    descricao,
    tipo,
    categoriaId: params.categoriaId,
    imagemUrl: params.imagemUrl,
    linkExterno: params.linkExterno,
    statusPublicacao: "pendente",
  });

  return { ok: true, id };
}

export async function listarItensPublicos(categoriaId?: number, tipo?: string) {
  const itens = await marketplaceRepo.listarItensAprovados({ categoriaId, tipo });
  return itens.map((i: any) => ({
    ...i,
    isProduto: i.tipo === "produto",
    isServico: i.tipo === "servico",
    isCampanha: i.tipo === "campanha",
    isBanner: i.tipo === "banner",
    isLink: i.tipo === "link",
    tipoLabel: ({ produto: "Produto", servico: "Serviço", campanha: "Campanha", banner: "Institucional", link: "Link" } as Record<string, string>)[i.tipo] ?? i.tipo,
  }));
}

export async function listarItensEmpresa(empresaId: number) {
  const itens = await marketplaceRepo.listarItensDaEmpresa(empresaId);
  return itens.map((i: any) => ({
    ...i,
    tipoLabel: ({ produto: "Produto", servico: "Serviço", campanha: "Campanha", banner: "Institucional", link: "Link" } as Record<string, string>)[i.tipo] ?? i.tipo,
    isAprovado: i.status_publicacao === "aprovado",
    isPendente: i.status_publicacao === "pendente",
    isRejeitado: i.status_publicacao === "rejeitado",
    isRascunho: i.status_publicacao === "rascunho",
  }));
}
