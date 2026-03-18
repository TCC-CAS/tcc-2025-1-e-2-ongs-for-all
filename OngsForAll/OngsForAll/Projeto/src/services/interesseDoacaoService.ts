import * as interesseRepo from "../repositories/interesseDoacaoRepository";
import * as doacaoRepo from "../repositories/doacaoRepository";
import * as notificacaoService from "../services/notificacaoService";

export async function getNovaPaginaInteresse(
    userId: number,
    necessidadeId: number
) {
    const necessidade = await interesseRepo.buscarNecessidadePorId(necessidadeId);

    if (!necessidade) {
        throw new Error("Necessidade não encontrada.");
    }

    return { necessidade };
}

export async function criarInteresse(params: {
    userId: number;
    necessidadeId: number;
    quantidade?: number;
    observacao?: string;
    dataPrevista?: string;
}) {
    const userExists = await doacaoRepo.userExists(params.userId);

    if (!userExists) {
        return {
            ok: false as const,
            error: "Apenas usuários podem demonstrar interesse em ajudar.",
        };
    }

    const necessidade = await interesseRepo.buscarNecessidadePorId(
        params.necessidadeId
    );

    if (!necessidade) {
        return {
            ok: false as const,
            error: "Necessidade não encontrada.",
        };
    }

    if (necessidade.status === "concluida" || necessidade.status === "cancelada") {
        return {
            ok: false as const,
            error: "Essa necessidade não está mais disponível para recebimento.",
        };
    }

    if (
        params.quantidade !== undefined &&
        (Number.isNaN(Number(params.quantidade)) || Number(params.quantidade) < 1)
    ) {
        return {
            ok: false as const,
            error: "A quantidade deve ser maior que zero.",
        };
    }

    await interesseRepo.createInteresse({
        usuarioId: params.userId,
        ongId: Number(necessidade.ong_id),
        necessidadeId: params.necessidadeId,
        quantidade: params.quantidade ? Number(params.quantidade) : null,
        observacao: params.observacao?.trim() || null,
        dataPrevista: params.dataPrevista || null,
    });

    const usuario = await doacaoRepo.buscarNomeUsuarioPorId(params.userId);
    const nomeUsuario = usuario?.nome ?? "Um usuário";

    await notificacaoService.criarNotificacaoParaOng({
        ongId: Number(necessidade.ong_id),
        titulo: "Novo interesse recebido",
        mensagem: `${nomeUsuario} demonstrou interesse em ajudar a necessidade "${necessidade.titulo}".`,
        tipo: "novo_interesse",
    });

    return { ok: true as const };
}

const STATUS_FILTRO_VALIDOS = ["pendente", "confirmado", "cancelado", "todos"];

export async function listarInteressesDaOng(
    ongId: number,
    status?: string
) {
    const filtro = STATUS_FILTRO_VALIDOS.includes(status || "")
        ? status
        : "pendente";

    const interesses = await interesseRepo.listarInteressesPorOng(ongId, filtro);

    return {
        ok: true as const,
        interesses,
        filtroAtual: filtro,
    };
}

export async function confirmarInteresse(params: {
    interesseId: number;
    ongId: number;
}) {
    const interesse = await interesseRepo.buscarInteressePorId(params.interesseId);

    if (!interesse) {
        return { ok: false as const, error: "Interesse não encontrado." };
    }

    if (Number(interesse.ong_id) !== Number(params.ongId)) {
        return { ok: false as const, error: "Você não pode alterar este interesse." };
    }

    if (interesse.status !== "pendente") {
        return {
            ok: false as const,
            error: "Somente interesses pendentes podem ser confirmados.",
        };
    }

    const quantidade = Number(interesse.quantidade ?? 0);

    await interesseRepo.atualizarStatusInteresse(interesse.id, "confirmado");

    await notificacaoService.criarNotificacaoParaUsuario({
        usuarioId: Number(interesse.usuario_id),
        titulo: "Interesse confirmado",
        mensagem: `${interesse.nome_ong} confirmou seu interesse em ajudar a necessidade.`,
        tipo: "interesse_confirmado",
    });

    if (quantidade > 0) {
        await interesseRepo.atualizarQuantidadeRecebidaNecessidade({
            necessidadeId: Number(interesse.necessidade_id),
            quantidade,
        });

        await interesseRepo.concluirNecessidadeSeMetaAtingida(
            Number(interesse.necessidade_id)
        );
    }

    return { ok: true as const };


}

export async function cancelarInteresse(params: {
    interesseId: number;
    ongId: number;
}) {
    const interesse = await interesseRepo.buscarInteressePorId(params.interesseId);

    if (!interesse) {
        return { ok: false as const, error: "Interesse não encontrado." };
    }

    if (Number(interesse.ong_id) !== Number(params.ongId)) {
        return { ok: false as const, error: "Você não pode alterar este interesse." };
    }

    if (interesse.status !== "pendente") {
        return {
            ok: false as const,
            error: "Somente interesses pendentes podem ser cancelados.",
        };
    }

    await interesseRepo.atualizarStatusInteresse(interesse.id, "cancelado");

    await notificacaoService.criarNotificacaoParaUsuario({
        usuarioId: Number(interesse.usuario_id),
        titulo: "Interesse cancelado",
        mensagem: `${interesse.nome_ong} cancelou o interesse relacionado à necessidade.`,
        tipo: "interesse_cancelado",
    });

    return { ok: true as const };
}