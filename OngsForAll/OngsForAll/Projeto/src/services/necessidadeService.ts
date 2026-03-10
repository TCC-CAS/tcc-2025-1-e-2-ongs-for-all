import * as necessidadeRepository from "../repositories/necessidadeRepository";

const STATUS_VALIDOS = ["aberta", "em_andamento", "concluida", "cancelada"];

export async function criarNecessidade(params: {
  ongId: number;
  titulo: string;
  descricao: string;
  categoria: string;
  quantidade: number;
}) {
  const titulo = params.titulo?.trim();
  const descricao = params.descricao?.trim();
  const categoria = params.categoria?.trim();
  const quantidade = Number(params.quantidade);

  if (!titulo || titulo.length < 3) {
    return { ok: false as const, error: "O título deve ter pelo menos 3 caracteres." };
  }

  if (!descricao || descricao.length < 10) {
    return { ok: false as const, error: "A descrição deve ter pelo menos 10 caracteres." };
  }

  if (!categoria) {
    return { ok: false as const, error: "Informe a categoria." };
  }

  if (Number.isNaN(quantidade) || quantidade < 1) {
    return { ok: false as const, error: "A quantidade deve ser maior que zero." };
  }

  await necessidadeRepository.createNecessidade({
    ongId: params.ongId,
    titulo,
    descricao,
    categoria,
    quantidade,
  });

  return { ok: true as const };
}

export async function listarNecessidadesAbertas() {
  const necessidades = await necessidadeRepository.findAllAbertas();
  return { ok: true as const, necessidades };
}

export async function buscarNecessidadePorId(id: number) {
  const necessidade = await necessidadeRepository.findById(id);

  if (!necessidade) {
    return { ok: false as const, error: "Necessidade não encontrada." };
  }

  return { ok: true as const, necessidade };
}

export async function listarNecessidadesDaOng(ongId: number) {
  const necessidades = await necessidadeRepository.findByOngId(ongId);
  return { ok: true as const, necessidades };
}

export async function alterarStatusNecessidade(params: {
  id: number;
  ongId: number;
  status: string;
}) {
  if (!STATUS_VALIDOS.includes(params.status)) {
    return { ok: false as const, error: "Status inválido." };
  }

  await necessidadeRepository.updateStatus(params.id, params.ongId, params.status);

  return { ok: true as const };
}