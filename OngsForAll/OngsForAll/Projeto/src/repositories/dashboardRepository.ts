import { pool } from "../config/ds";

export async function totalDoadoPorMes(usuarioId: number) {
  const [rows]: any = await pool.query(
    `
    SELECT MONTH(data) AS mes, SUM(valor) AS total
    FROM doacoes
    WHERE usuario_id = ?
    GROUP BY MONTH(data)
    ORDER BY mes
    `,
    [usuarioId]
  );
  return rows;
}

export async function totalDoadoPorTipo(usuarioId: number) {
  const [rows]: any = await pool.query(
    `
    SELECT tipo, SUM(valor) AS total
    FROM doacoes
    WHERE usuario_id = ?
    GROUP BY tipo
    ORDER BY tipo
    `,
    [usuarioId]
  );
  return rows;
}

export async function totalPorOng() {
  const [rows]: any = await pool.query(
    `
    SELECT ongs.nome AS nome, SUM(doacoes.valor) AS total
    FROM doacoes
    JOIN ongs ON doacoes.ong_id = ongs.ong_id
    GROUP BY ongs.nome
    ORDER BY total DESC
    `
  );
  return rows;
}

export async function getTotalPorOng() {
  const [rows]: any = await pool.query(`
    SELECT o.nome AS nome, COALESCE(SUM(d.valor), 0) AS total
    FROM ongs o
    LEFT JOIN doacoes d ON d.ong_id = o.ong_id
    GROUP BY o.ong_id, o.nome
    ORDER BY total DESC
  `);

  // garante total como number (MySQL costuma devolver string)
  return rows.map((r: any) => ({
    nome: r.nome,
    total: Number(r.total ?? 0),
  }));
}

export async function getTotalRecebido(ongId: number) {
  const [rows]: any = await pool.query(
    `SELECT COALESCE(SUM(valor), 0) AS total
     FROM doacoes
     WHERE ong_id = ?`,
    [ongId]
  );
  return rows[0]?.total ?? 0;
}

export async function getQtdDoacoes(ongId: number) {
  const [rows]: any = await pool.query(
    `SELECT COUNT(*) AS qtd
     FROM doacoes
     WHERE ong_id = ?`,
    [ongId]
  );
  return rows[0]?.qtd ?? 0;
}

export async function getQtdDoadores(ongId: number) {
  const [rows]: any = await pool.query(
    `SELECT COUNT(DISTINCT usuario_id) AS qtd
     FROM doacoes
     WHERE ong_id = ?`,
    [ongId]
  );
  return rows[0]?.qtd ?? 0;
}

export async function getDoacoesPorMesOng(ongId: number) {
  const [rows]: any = await pool.query(
    `SELECT MONTH(data) AS mes, SUM(valor) AS total
     FROM doacoes
     WHERE ong_id = ?
     GROUP BY MONTH(data)
     ORDER BY mes`,
    [ongId]
  );
  return rows;
}

export async function getDoacoesPorTipoOng(ongId: number) {
  const [rows]: any = await pool.query(
    `SELECT tipo, SUM(valor) AS total
     FROM doacoes
     WHERE ong_id = ?
     GROUP BY tipo
     ORDER BY tipo`,
    [ongId]
  );
  return rows;
}

export async function getUltimasDoacoesOng(ongId: number) {
  const [rows]: any = await pool.query(
    `SELECT 
        d.valor,
        d.tipo,
        DATE_FORMAT(d.data, '%d/%m/%Y') AS data,
        u.nome AS doador
     FROM doacoes d
     LEFT JOIN usuarios u ON d.usuario_id = u.id
     WHERE d.ong_id = ?
     ORDER BY d.data DESC
     LIMIT 10`,
    [ongId]
  );
  return rows;
}