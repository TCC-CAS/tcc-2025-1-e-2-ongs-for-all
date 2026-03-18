import bcrypt from "bcryptjs";
import * as perfilRepo from "../repositories/perfilRepository";

export async function getUserProfile(userId: number) {
  const user = await perfilRepo.findUserById(userId);
  if (!user) return { ok: false as const };
  return { ok: true as const, user };
}

export async function getOngProfile(ongId: number) {
  const ong = await perfilRepo.findOngById(ongId);
  if (!ong) return { ok: false as const };
  return { ok: true as const, user: ong };
}

async function hashPassword(password?: string) {
  if (!password || password.length === 0) return null;
  if (password.length < 6) {
    return { error: "A senha deve ter no mínimo 6 caracteres." };
  }
  return await bcrypt.hash(password, 10);
}

export async function updateProfile(params: {
  userId: number;
  nome: string;
  email: string;
  telefone?: string;
  password?: string;
}) {
  const { userId, nome, email, telefone, password } = params;

  const result = await hashPassword(password);
  if (result && typeof result === "object" && "error" in result) {
    return { ok: false as const, error: result.error };
  }

  await perfilRepo.updateUserProfile(userId, nome, email, telefone ?? null, result as string | null);
  return { ok: true as const };
}

export async function updateOngProfile(params: {
  ongId: number;
  nome: string;
  email: string;
  telefone?: string;
  areaAtuacao?: string;
  password?: string;
}) {
  const { ongId, nome, email, telefone, areaAtuacao, password } = params;

  const result = await hashPassword(password);
  if (result && typeof result === "object" && "error" in result) {
    return { ok: false as const, error: result.error };
  }

  await perfilRepo.updateOngProfile(ongId, nome, email, telefone ?? null, areaAtuacao ?? null, result as string | null);
  return { ok: true as const };
}