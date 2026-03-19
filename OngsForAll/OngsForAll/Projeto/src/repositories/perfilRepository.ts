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

export async function findOngById(id: number) {
  const [rows]: any = await pool.query(
    "SELECT ong_id AS id, nome, email, cnpj, area_atuacao, telefone FROM ongs WHERE ong_id = ? LIMIT 1",
    [id]
  );
  return rows?.[0] ?? null;
}

export async function updateOngProfile(
  id: number,
  nome: string,
  email: string,
  telefone?: string | null,
  areaAtuacao?: string | null,
  passwordHash?: string | null
) {
  let query = "UPDATE ongs SET nome = ?, email = ?, telefone = ?, area_atuacao = ?";
  const params: any[] = [nome, email, telefone ?? null, areaAtuacao ?? null];

  if (passwordHash) {
    query += ", senha = ?";
    params.push(passwordHash);
  }

  query += " WHERE ong_id = ?";
  params.push(id);

  await pool.query(query, params);
}