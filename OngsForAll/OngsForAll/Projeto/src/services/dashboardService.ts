import { pool } from "../config/ds";
import * as dashboardRepository from "../repositories/dashboardRepository";

export async function getTotalPorOng() {
  const dados = await dashboardRepository.getTotalPorOng();
  return { dados };
}

export async function getDashboardData(userId: number) {
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  // 1) Total doado por mês (R$)
  const [rowsDoadoMes]: any = await pool.query(
    `
    SELECT MONTH(data) AS mes, SUM(valor) AS total
    FROM doacoes
    WHERE usuario_id = ?
    GROUP BY MONTH(data)
    ORDER BY mes
    `,
    [userId]
  );

  const labelsMes = rowsDoadoMes.map((r: any) => meses[r.mes - 1]);
  const valoresDoadoMes = rowsDoadoMes.map((r: any) => Number(r.total || 0));

  // 2) ONGs apoiadas por mês (contagem distinta)
  const [rowsOngsMes]: any = await pool.query(
    `
    SELECT MONTH(data) AS mes, COUNT(DISTINCT ong_id) AS total_ongs
    FROM doacoes
    WHERE usuario_id = ?
    GROUP BY MONTH(data)
    ORDER BY mes
    `,
    [userId]
  );

  // garante alinhamento de labels com o gráfico de doado/mês
  const ongsPorMesMap = new Map<number, number>();
  rowsOngsMes.forEach((r: any) => ongsPorMesMap.set(Number(r.mes), Number(r.total_ongs || 0)));

  const valoresOngsMes = rowsDoadoMes.map((r: any) => ongsPorMesMap.get(Number(r.mes)) ?? 0);

  // 3) Doações por tipo (para doughnut)
  const [rowsTipo]: any = await pool.query(
    `
    SELECT tipo, SUM(valor) AS total
    FROM doacoes
    WHERE usuario_id = ?
    GROUP BY tipo
    ORDER BY tipo
    `,
    [userId]
  );

  const labelsTipo = rowsTipo.map((r: any) => r.tipo);
  const valoresTipo = rowsTipo.map((r: any) => Number(r.total || 0));

  // KPIs
  const totalDoado = valoresDoadoMes.reduce((acc: number, v: number) => acc + v, 0).toFixed(2);
  const qtdTipos = labelsTipo.length;
  const qtdMesesComDoacao = labelsMes.length;

  return {
    totalDoado,
    qtdTipos,
    qtdMesesComDoacao,
    labelsMes,
    valoresDoadoMes,
    valoresOngsMes,
    labelsTipo,
    valoresTipo,
  };
}

export async function getOngDashboardData(ongId: number) {
  const [totalRecebido, qtdDoacoes, qtdDoadores] = await Promise.all([
    dashboardRepository.getTotalRecebido(ongId),
    dashboardRepository.getQtdDoacoes(ongId),
    dashboardRepository.getQtdDoadores(ongId),
  ]);

  const porMes = await dashboardRepository.getDoacoesPorMesOng(ongId);
  const porTipo = await dashboardRepository.getDoacoesPorTipoOng(ongId);
  const ultimasDoacoes = await dashboardRepository.getUltimasDoacoesOng(ongId);

  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const labelsMes = porMes.map((d: any) => meses[d.mes - 1]);
  const valoresMes = porMes.map((d: any) => Number(d.total));

  const labelsTipo = porTipo.map((d: any) => d.tipo);
  const valoresTipo = porTipo.map((d: any) => Number(d.total));

  return {
    totalRecebido: Number(totalRecebido).toFixed(2),
    qtdDoacoes: Number(qtdDoacoes),
    qtdDoadores: Number(qtdDoadores),
    labelsMes,
    valoresMes,
    labelsTipo,
    valoresTipo,
    ultimasDoacoes,
  };
}