import * as notificacaoRepository from "../repositories/notificacaoRepository";

export async function criarNotificacaoParaOng(params: {
    ongId: number;
    titulo: string;
    mensagem: string;
    tipo: string;
}) {
    await notificacaoRepository.createNotificacao({
        ongId: params.ongId,
        titulo: params.titulo,
        mensagem: params.mensagem,
        tipo: params.tipo,
    });
}

export async function criarNotificacaoParaUsuario(params: {
    usuarioId: number;
    titulo: string;
    mensagem: string;
    tipo: string;
}) {
    await notificacaoRepository.createNotificacao({
        usuarioId: params.usuarioId,
        titulo: params.titulo,
        mensagem: params.mensagem,
        tipo: params.tipo,
    });
}

export async function listarNotificacoes(params: {
    tipoConta: "usuario" | "ong";
    id: number;
}) {
    if (params.tipoConta === "ong") {
        const notificacoes = await notificacaoRepository.listarNotificacoesOng(params.id);
        const naoLidas = await notificacaoRepository.contarNaoLidasOng(params.id);
        return { notificacoes, naoLidas };
    }

    const notificacoes = await notificacaoRepository.listarNotificacoesUsuario(params.id);
    const naoLidas = await notificacaoRepository.contarNaoLidasUsuario(params.id);
    return { notificacoes, naoLidas };
}

export async function marcarComoLida(id: number) {
    await notificacaoRepository.marcarComoLida(id);
}

export async function contarNaoLidas(params: {
    tipoConta: "usuario" | "ong";
    id: number;
}) {
    if (params.tipoConta === "ong") {
        const naoLidas = await notificacaoRepository.contarNaoLidasOng(params.id);
        return { naoLidas };
    }

    const naoLidas = await notificacaoRepository.contarNaoLidasUsuario(params.id);
    return { naoLidas };
}