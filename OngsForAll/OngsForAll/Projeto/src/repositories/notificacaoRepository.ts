import { pool } from "../config/ds";

export async function createNotificacao(params: {
  usuarioId?: number | null;
  ongId?: number | null;
  titulo: string;
  mensagem: string;
  tipo: string;
}) {
  await pool.query(
    `
    INSERT INTO notificacoes (
      usuario_id,
      ong_id,
      titulo,
      mensagem,
      tipo,
      lida,
      criado_em
    )
    VALUES (?, ?, ?, ?, ?, 0, NOW())
    `,
    [
      params.usuarioId ?? null,
      params.ongId ?? null,
      params.titulo,
      params.mensagem,
      params.tipo,
    ]
  );
}

export async function listarNotificacoesUsuario(usuarioId: number) {
  const [rows]: any = await pool.query(
    `
    SELECT
      id,
      titulo,
      mensagem,
      tipo,
      lida,
      DATE_FORMAT(criado_em, '%d/%m/%Y %H:%i') AS criado_em
    FROM notificacoes
    WHERE usuario_id = ?
    ORDER BY criado_em DESC
    `,
    [usuarioId]
  );

  return rows;
}

export async function listarNotificacoesOng(ongId: number) {
  const [rows]: any = await pool.query(
    `
    SELECT
      id,
      titulo,
      mensagem,
      tipo,
      lida,
      DATE_FORMAT(criado_em, '%d/%m/%Y %H:%i') AS criado_em
    FROM notificacoes
    WHERE ong_id = ?
    ORDER BY criado_em DESC
    `,
    [ongId]
  );

  return rows;
}

export async function contarNaoLidasUsuario(usuarioId: number) {
  const [rows]: any = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM notificacoes
    WHERE usuario_id = ? AND lida = 0
    `,
    [usuarioId]
  );

  return rows?.[0]?.total ?? 0;
}

export async function contarNaoLidasOng(ongId: number) {
  const [rows]: any = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM notificacoes
    WHERE ong_id = ? AND lida = 0
    `,
    [ongId]
  );

  return rows?.[0]?.total ?? 0;
}

export async function createNotificacaoParaTodosUsuarios(params: {
  titulo: string;
  mensagem: string;
  tipo: string;
}) {
  await pool.query(
    `
    INSERT INTO notificacoes (usuario_id, ong_id, titulo, mensagem, tipo, lida, criado_em)
    SELECT id, NULL, ?, ?, ?, 0, NOW()
    FROM usuarios
    `,
    [params.titulo, params.mensagem, params.tipo]
  );
}

export async function marcarComoLida(id: number) {
  await pool.query(
    `
    UPDATE notificacoes
    SET lida = 1
    WHERE id = ?
    `,
    [id]
  );
}