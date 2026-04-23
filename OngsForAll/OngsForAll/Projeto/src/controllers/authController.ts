// src/controllers/authController.ts
import { FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import { z, ZodError } from "zod";
import { validateLogin } from "../validators/authValidator";

import * as authService from "../services/authService";
import { pool } from "../config/ds"; // ainda usado em registerUser/registerONG por enquanto (pode refatorar depois)

// =======================
// Schemas (validação)
// =======================
const registerUserSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  cpf: z.string().min(11),
  telefone: z.string().min(8),
});

const ongSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  cnpj: z.string().min(14).max(18),
  area_atuacao: z.string().min(1),
  telefone: z.string().min(8),
});

// =======================
// Pages
// =======================
export async function renderAuthLoginPage(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const logoutSuccess = (request.query as any).logout === "1";
  const resetSuccess = (request.query as any).reset === "1";
  return reply.view(
    "/templates/auth/login.hbs",
    { logoutSuccess, resetSuccess },
    { layout: "layouts/authLayout" }
  );
}

export async function renderAuthRegisterPage(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  return reply.view("/templates/auth/register.hbs", {}, { layout: "layouts/authLayout" });
}

// =======================
// Cadastro (mantido com SQL direto por enquanto)
// =======================
export async function registerUser(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = registerUserSchema.parse(request.body);
    const hashedPassword = await bcrypt.hash(body.password, 10);

    await pool.query(
      `INSERT INTO usuarios (nome, email, senha, cpf, telefone)
       VALUES (?, ?, ?, ?, ?)`,
      [body.nome, body.email, hashedPassword, body.cpf, body.telefone]
    );

    return reply.redirect("/login");
  } catch (error: any) {
    console.error("Erro ao registrar usuário:", error);

    if (error instanceof ZodError) {
      return reply.status(400).send({ message: "Dados inválidos", errors: error.errors });
    }

    if (error?.code === "ER_DUP_ENTRY") {
      return reply.status(400).send({ message: "Email já cadastrado." });
    }

    return reply.status(500).send({ message: "Erro no banco", error });
  }
}

export async function registerONG(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as {
      nomeong: string;
      emailong: string;
      passwordong: string;
      cnpj_ong: string;
      areadeatuacao: string;
      telefoneong: string;
    };

    const ong = ongSchema.parse({
      nome: body.nomeong,
      email: body.emailong,
      password: body.passwordong,
      cnpj: body.cnpj_ong,
      area_atuacao: body.areadeatuacao,
      telefone: body.telefoneong,
    });

    const hashedPassword = await bcrypt.hash(ong.password, 10);

    await pool.query(
      `INSERT INTO ongs (nome, email, senha, cnpj, area_atuacao, telefone)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ong.nome, ong.email, hashedPassword, ong.cnpj, ong.area_atuacao, ong.telefone]
    );

    return reply.redirect("/login");
  } catch (error: any) {
    console.error("Erro ao cadastrar ONG:", error);

    if (error instanceof ZodError) {
      return reply.status(400).send({ message: "Dados inválidos", errors: error.errors });
    }

    if (error?.code === "ER_DUP_ENTRY") {
      return reply.status(400).send({ message: "Email da ONG já cadastrado." });
    }

    return reply.status(500).send({ message: "Erro ao cadastrar ONG", error });
  }
}

// =======================
// Login (agora via Service)
// =======================
export async function loginUser(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { email, password } = request.body as {
    email: string;
    password: string;
  };

  const ip = request.ip;

  const validation = validateLogin({ email, password });

  if (!validation.isValid) {
    if (process.env.NODE_ENV === "test") {
      return reply.status(400).send({ error: validation.errors[0] });
    }

    return reply.status(400).view(
      "/templates/auth/login.hbs",
      {
        error: validation.errors[0],
        email,
      },
      { layout: "layouts/authLayout" }
    );
  }

  try {
    const result = await authService.login(email.trim(), password, ip);

    if (!result.ok) {
      if (process.env.NODE_ENV === "test") {
        return reply.status(401).send({ error: "E-mail ou senha incorretos" });
      }

      return reply.view(
        "/templates/auth/login.hbs",
        {
          error: "E-mail ou senha incorretos",
          email,
        },
        { layout: "layouts/authLayout" }
      );
    }

    request.session.user = result.user;
    console.log(`[LOGIN] ${result.user.tipo.toUpperCase()} | ${result.user.email}`);

    if (result.user.tipo === "ong") {
      return reply.redirect("/dashboard/ong");
    }

    if (result.user.tipo === "empresa") {
      return reply.redirect("/empresa/dashboard");
    }

    return reply.redirect("/dashboard");
  } catch (error) {
    console.error("Erro ao fazer login:", error);

    if (process.env.NODE_ENV === "test") {
      return reply.status(500).send({ error: "Erro interno no servidor" });
    }

    return reply.status(500).send({ message: "Erro no servidor" });
  }
}

export async function logoutUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = request.session.user;
  try {
    await request.session.destroy();
  } catch (err) {
    // sessão já expirada
  }
  if (user) {
    console.log(`[LOGOUT] ${user.tipo.toUpperCase()} | ${user.email}`);
  }
  return reply.redirect("/login?logout=1");
}

// =======================
// Esqueci senha (agora via Service)
// =======================
export async function renderForgotPasswordPage(request: FastifyRequest, reply: FastifyReply) {
  return reply.view("/templates/auth/forgotPassword.hbs", {}, { layout: "layouts/authLayout" });
}

export async function handleForgotPassword(request: FastifyRequest, reply: FastifyReply) {
  const { nome, email, cpf } = request.body as { nome: string; email: string; cpf: string };

  try {
    const result = await authService.requestPasswordReset(nome, email, cpf);

    // Mensagem neutra (segurança/anti-enumeração)
    const neutralMsg =
      "Se os dados estiverem corretos, você receberá instruções para redefinir sua senha.";

    if (result.ok) {
      const baseUrl = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
      const resetLink = `${baseUrl}/redefinir-senha?token=${result.token}`;
      console.log(`[RESET SENHA] Token gerado para: ${email}\n  Link: ${resetLink}`);
    }

    return reply.view(
      "/templates/auth/forgotPassword.hbs",
      { success: neutralMsg },
      { layout: "layouts/authLayout" }
    );
  } catch (error) {
    console.error("Erro ao gerar reset:", error);
    return reply.status(500).send({ message: "Erro no servidor" });
  }
}

// =======================
// Redefinir senha (token)
// =======================
export async function renderResetPasswordPage(request: FastifyRequest, reply: FastifyReply) {
  const { token } = request.query as { token?: string };

  return reply.view(
    "/templates/auth/resetPassword.hbs",
    { token: token ?? "" },
    { layout: "layouts/authLayout" }
  );
}

export async function handleResetPassword(request: FastifyRequest, reply: FastifyReply) {
  const { token, password, confirmarSenha } = request.body as {
    token: string;
    password: string;
    confirmarSenha?: string;
  };

  if (!token) {
    return reply.view(
      "/templates/auth/resetPassword.hbs",
      { token: "", error: "Token ausente. Solicite a redefinição novamente." },
      { layout: "layouts/authLayout" }
    );
  }

  if (!password || password.length < 6) {
    return reply.view(
      "/templates/auth/resetPassword.hbs",
      { token, error: "A senha deve ter no mínimo 6 caracteres." },
      { layout: "layouts/authLayout" }
    );
  }

  if (confirmarSenha !== undefined && password !== confirmarSenha) {
    return reply.view(
      "/templates/auth/resetPassword.hbs",
      { token, error: "As senhas não coincidem." },
      { layout: "layouts/authLayout" }
    );
  }

  try {
    const result = await authService.resetPassword(token, password);

    if (!result.ok) {
      return reply.view(
        "/templates/auth/resetPassword.hbs",
        { token, error: "Token inválido ou expirado. Solicite novamente." },
        { layout: "layouts/authLayout" }
      );
    }

    return reply.redirect("/login?reset=1");
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
    return reply.view(
      "/templates/auth/resetPassword.hbs",
      { token, error: "Erro interno ao redefinir. Tente novamente." },
      { layout: "layouts/authLayout" }
    );
  }
}