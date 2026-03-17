import { pool } from "../config/ds";

export async function createNecessidade(params: {
  ongId: number;
  titulo: string;
  descricao: string;
  categoria: string;
  quantidade: number;
}) {
  await pool.query(
    `
    INSERT INTO necessidades (
      ong_id,
      titulo,
      descricao,
      categoria,
      quantidade,
      quantidade_recebida,
      status,
      criado_em,
      atualizado_em
    )
    VALUES (?, ?, ?, ?, ?, 0, 'aberta', NOW(), NOW())
    `,
    [params.ongId, params.titulo, params.descricao, params.categoria, params.quantidade]
  );
}

export async function findAllAbertas() {
  const [rows]: any = await pool.query(
    `
    SELECT 
      n.id,
      n.titulo,
      n.descricao,
      n.categoria,
      n.quantidade,
      n.quantidade_recebida,
      n.status,
      n.criado_em,
      o.nome AS nome_ong,
      GREATEST(n.quantidade - n.quantidade_recebida, 0) AS faltante,
      LEAST(
        ROUND((n.quantidade_recebida / NULLIF(n.quantidade, 0)) * 100, 0),
        100
      ) AS percentual,
      CASE
        WHEN n.quantidade_recebida >= n.quantidade THEN 1
        ELSE 0
      END AS meta_atingida,
      CASE
        WHEN n.quantidade_recebida < n.quantidade
          AND LEAST(
            ROUND((n.quantidade_recebida / NULLIF(n.quantidade, 0)) * 100, 0),
            100
          ) >= 80
        THEN 1
        ELSE 0
      END AS quase_completa
    FROM necessidades n
    INNER JOIN ongs o ON o.ong_id = n.ong_id
    WHERE n.status = 'aberta'
    ORDER BY n.criado_em DESC
    `
  );

  return rows;
}

export async function findById(id: number) {
  const [rows]: any = await pool.query(
    `
    SELECT 
      n.id,
      n.ong_id,
      n.titulo,
      n.descricao,
      n.categoria,
      n.quantidade,
      n.quantidade_recebida,
      n.status,
      n.criado_em,
      n.atualizado_em,
      o.nome AS nome_ong,
      o.email AS email_ong,
      GREATEST(n.quantidade - n.quantidade_recebida, 0) AS faltante,
      LEAST(
        ROUND((n.quantidade_recebida / NULLIF(n.quantidade, 0)) * 100, 0),
        100
      ) AS percentual,
      CASE
        WHEN n.quantidade_recebida >= n.quantidade THEN 1
        ELSE 0
      END AS meta_atingida,
      CASE
        WHEN n.quantidade_recebida < n.quantidade
          AND LEAST(
            ROUND((n.quantidade_recebida / NULLIF(n.quantidade, 0)) * 100, 0),
            100
          ) >= 80
        THEN 1
        ELSE 0
      END AS quase_completa
    FROM necessidades n
    INNER JOIN ongs o ON o.ong_id = n.ong_id
    WHERE n.id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows?.[0] ?? null;
}

export async function findByOngId(ongId: number) {
  const [rows]: any = await pool.query(
    `
    SELECT 
      n.id,
      n.titulo,
      n.descricao,
      n.categoria,
      n.quantidade,
      n.quantidade_recebida,
      n.status,
      n.criado_em,
      n.atualizado_em,
      GREATEST(n.quantidade - n.quantidade_recebida, 0) AS faltante,
      LEAST(
        ROUND((n.quantidade_recebida / NULLIF(n.quantidade, 0)) * 100, 0),
        100
      ) AS percentual,
      CASE
        WHEN n.quantidade_recebida >= n.quantidade THEN 1
        ELSE 0
      END AS meta_atingida,
      CASE
        WHEN n.quantidade_recebida < n.quantidade
          AND LEAST(
            ROUND((n.quantidade_recebida / NULLIF(n.quantidade, 0)) * 100, 0),
            100
          ) >= 80
        THEN 1
        ELSE 0
      END AS quase_completa
    FROM necessidades n
    WHERE n.ong_id = ?
    ORDER BY n.criado_em DESC
    `,
    [ongId]
  );

  return rows;
}

export async function updateStatus(id: number, ongId: number, status: string) {
  await pool.query(
    `
    UPDATE necessidades
    SET status = ?, atualizado_em = NOW()
    WHERE id = ? AND ong_id = ?
    `,
    [status, id, ongId]
  );
}