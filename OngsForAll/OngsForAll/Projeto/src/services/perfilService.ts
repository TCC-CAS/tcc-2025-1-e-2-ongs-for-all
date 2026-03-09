import bcrypt from "bcryptjs";
import * as perfilRepo from "../repositories/perfilRepository";

export async function getUserProfile(userId: number) {
  const user = await perfilRepo.findUserById(userId);
  if (!user) return { ok: false as const };
  return { ok: true as const, user };
}

export async function updateProfile(params: {
  userId: number;
  nome: string;
  email: string;
  telefone?: string;
  password?: string;
}) {
  const { userId, nome, email, telefone, password } = params;

  let passwordHash: string | null = null;

  if (password && password.length > 0) {
    if (password.length < 6) {
      return { ok: false as const, error: "A senha deve ter no mínimo 6 caracteres." };
    }
    passwordHash = await bcrypt.hash(password, 10);
  }

  await perfilRepo.updateUserProfile(userId, nome, email, telefone ?? null, passwordHash);

  return { ok: true as const };
}