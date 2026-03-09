import { pool } from "../config/ds";

export async function findUserById(id: number) {
  const [rows]: any = await pool.query(
    "SELECT id, nome, email, cpf, telefone FROM usuarios WHERE id = ? LIMIT 1",
    [id]
  );
  return rows?.[0] ?? null;
}

export async function updateUserProfile(
  id: number,
  nome: string,
  email: string,
  telefone?: string | null,
  passwordHash?: string | null
) {
  // monta query dinamicamente
  let query = "UPDATE usuarios SET nome = ?, email = ?, telefone = ?";
  const params: any[] = [nome, email, telefone ?? null];

  if (passwordHash) {
    query += ", senha = ?";
    params.push(passwordHash);
  }

  query += " WHERE id = ?";
  params.push(id);

  await pool.query(query, params);
}