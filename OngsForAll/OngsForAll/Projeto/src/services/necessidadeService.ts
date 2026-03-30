import * as necessidadeRepository from "../repositories/necessidadeRepository";
import { notificarTodosUsuarios } from "./notificacaoService";
import { validateNecessidade, validateStatus } from "../validators/necessidadeValidator";

export async function criarNecessidade(params: {
  ongId: number;
  titulo: string;
  descricao: string;
  categoria: string;
  quantidade: number;
}) {
  const validation = validateNecessidade({
    titulo: params.titulo,
    descricao: params.descricao,
    categoria: params.categoria,
    quantidade: params.quantidade,
  });

  if (!validation.isValid) {
    return { ok: false as const, error: validation.errors[0] };
  }

  const titulo = params.titulo.trim();
  const descricao = params.descricao.trim();
  const categoria = params.categoria.trim();
  const quantidade = Number(params.quantidade);

  await necessidadeRepository.createNecessidade({
    ongId: params.ongId,
    titulo,
    descricao,
    categoria,
    quantidade,
  });

  const ong = await necessidadeRepository.buscarNomeOngPorId(params.ongId);
  const nomeOng = ong?.nome ?? "Uma ONG";

  await notificarTodosUsuarios({
    titulo: "Nova necessidade cadastrada!",
    mensagem: `${nomeOng} cadastrou uma nova necessidade: "${titulo}". Confira e veja como você pode ajudar!`,
    tipo: "nova_necessidade",
  });

  return { ok: true as const };
}

export async function listarNecessidadesAbertas(ongId?: number) {
  const necessidades = await necessidadeRepository.findAllAbertas(ongId);
  return { ok: true as const, necessidades };
}

export async function buscarNecessidadePorId(id: number) {
  const necessidade = await necessidadeRepository.findById(id);

  if (!necessidade) {
    return { ok: false as const, error: "Necessidade não encontrada." };
  }

  return { ok: true as const, necessidade };
}

const STATUS_FILTRO_VALIDOS = ["aberta", "em_andamento", "concluida", "cancelada", "todos"];

export async function listarNecessidadesDaOng(ongId: number, status?: string) {
  const filtro = STATUS_FILTRO_VALIDOS.includes(status || "") ? status : undefined;
  const necessidades = await necessidadeRepository.findByOngId(ongId, filtro);
  return { ok: true as const, necessidades, filtroAtual: filtro ?? "todos" };
}

export async function alterarStatusNecessidade(params: {
  id: number;
  ongId: number;
  status: string;
}) {
  const statusValidation = validateStatus(params.status);
  if (!statusValidation.isValid) {
    return { ok: false as const, error: statusValidation.error! };
  }

  await necessidadeRepository.updateStatus(params.id, params.ongId, params.status);

  return { ok: true as const };
}