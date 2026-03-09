import { FastifyRequest, FastifyReply } from "fastify";
import * as interesseService from "../services/interesseDoacaoService";

export async function renderNovaPaginaInteresse(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const user = request.session.user;

    if (!user) {
        return reply.redirect("/login");
    }

    const { necessidade_id } = request.query as { necessidade_id?: string };

    try {
        if (!necessidade_id) {
            return reply.code(400).send("Necessidade não informada.");
        }

        const { necessidade } = await interesseService.getNovaPaginaInteresse(
            Number(user.id),
            Number(necessidade_id)
        );

        return reply.view(
            "/templates/interesses/nova.hbs",
            {
                user,
                necessidade,
                formData: {
                    necessidade_id,
                },
            },
            { layout: "layouts/doarLayout" }
        );
    } catch (error: any) {
        console.error("Erro ao carregar página de interesse:", error);
        return reply
            .code(500)
            .send(error?.message ?? "Erro ao carregar página de interesse.");
    }
}

export async function criarInteresse(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const user = request.session.user;

    if (!user) {
        return reply.redirect("/login");
    }

    const { necessidade_id, quantidade, observacao, data_prevista } =
        request.body as {
            necessidade_id: string;
            quantidade?: string;
            observacao?: string;
            data_prevista?: string;
        };

    try {
        const result = await interesseService.criarInteresse({
            userId: Number(user.id),
            necessidadeId: Number(necessidade_id),
            quantidade: quantidade ? Number(quantidade) : undefined,
            observacao,
            dataPrevista: data_prevista,
        });

        if (!result.ok) {
            return reply.code(400).send(result.error);
        }

        return reply.redirect("/dashboard?interesse=1");
    } catch (error: any) {
        console.error("Erro ao criar interesse:", error);
        return reply.code(500).send(error?.message ?? "Erro ao criar interesse.");
    }
}

export async function renderInteressesOngPage(
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

    const { status } = request.query as {
        status?: string;
    };

    const result = await interesseService.listarInteressesDaOng(
        Number(sessionUser.id),
        status
    );

    return reply.view(
        "/templates/interesses/lista-ong.hbs",
        {
            user: sessionUser,
            interesses: result.interesses,
            filtroAtual: result.filtroAtual,
            success: (request.query as any)?.sucesso === "1",
        },
        { layout: "layouts/ongDashboardLayout" }
    );
}

export async function confirmarInteresse(
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

    const result = await interesseService.confirmarInteresse({
        interesseId: Number(id),
        ongId: Number(sessionUser.id),
    });

    if (!result.ok) {
        return reply.code(400).send(result.error);
    }

    return reply.redirect("/ong/interesses?status=pendente&sucesso=1");
}

export async function cancelarInteresse(
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

    const result = await interesseService.cancelarInteresse({
        interesseId: Number(id),
        ongId: Number(sessionUser.id),
    });

    if (!result.ok) {
        return reply.code(400).send(result.error);
    }

    return reply.redirect("/ong/interesses?status=pendente&sucesso=1");
}