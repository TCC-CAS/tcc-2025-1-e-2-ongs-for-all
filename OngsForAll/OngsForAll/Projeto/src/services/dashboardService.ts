import { pool } from "../config/ds";
import * as dashboardRepository from "../repositories/dashboardRepository";

export async function getTotalPorOng() {
  const dados = await dashboardRepository.getTotalPorOng();
  return { dados };
}

export async function getDashboardData(userId: number, de?: string, ate?: string) {
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  function buildDateFilter(params: any[]): string {
    let clause = "";
    if (de) { clause += " AND data >= ?"; params.push(de); }
    if (ate) { clause += " AND data <= ?"; params.push(ate); }
    return clause;
  }

  // 1) Total doado por mês (R$)
  const paramsMes: any[] = [userId];
  const dateFilterMes = buildDateFilter(paramsMes);
  const [rowsDoadoMes]: any = await pool.query(
    `
    SELECT MONTH(data) AS mes, SUM(valor) AS total
    FROM doacoes
    WHERE usuario_id = ?${dateFilterMes}
    GROUP BY MONTH(data)
    ORDER BY mes
    `,
    paramsMes
  );

  const labelsMes = rowsDoadoMes.map((r: any) => meses[r.mes - 1]);
  const valoresDoadoMes = rowsDoadoMes.map((r: any) => Number(r.total || 0));

  // 2) ONGs apoiadas por mês (contagem distinta)
  const paramsOngs: any[] = [userId];
  const dateFilterOngs = buildDateFilter(paramsOngs);
  const [rowsOngsMes]: any = await pool.query(
    `
    SELECT MONTH(data) AS mes, COUNT(DISTINCT ong_id) AS total_ongs
    FROM doacoes
    WHERE usuario_id = ?${dateFilterOngs}
    GROUP BY MONTH(data)
    ORDER BY mes
    `,
    paramsOngs
  );

  // garante alinhamento de labels com o gráfico de doado/mês
  const ongsPorMesMap = new Map<number, number>();
  rowsOngsMes.forEach((r: any) => ongsPorMesMap.set(Number(r.mes), Number(r.total_ongs || 0)));

  const valoresOngsMes = rowsDoadoMes.map((r: any) => ongsPorMesMap.get(Number(r.mes)) ?? 0);

  // 3) Doações por tipo (para doughnut)
  const paramsTipo: any[] = [userId];
  const dateFilterTipo = buildDateFilter(paramsTipo);
  const [rowsTipo]: any = await pool.query(
    `
    SELECT tipo, SUM(valor) AS total
    FROM doacoes
    WHERE usuario_id = ?${dateFilterTipo}
    GROUP BY tipo
    ORDER BY tipo
    `,
    paramsTipo
  );

  const labelsTipo = rowsTipo.map((r: any) => r.tipo);
  const valoresTipo = rowsTipo.map((r: any) => Number(r.total || 0));

  // KPIs
  const totalDoado = valoresDoadoMes.reduce((acc: number, v: number) => acc + v, 0).toFixed(2);
  const qtdTipos = labelsTipo.length;
  const qtdMesesComDoacao = labelsMes.length;

  // Métricas de impacto
  const [necessidadesApoiadas, ongsApoiadas, interessesCriados, interessesRecebidos, atividadesRecentes] =
    await Promise.all([
      dashboardRepository.getNecessidadesApoiadasUsuario(userId, de, ate),
      dashboardRepository.getOngsApoiadasUsuario(userId, de, ate),
      dashboardRepository.getInteressesCriadosUsuario(userId, de, ate),
      dashboardRepository.getInteressesRecebidosUsuario(userId, de, ate),
      dashboardRepository.getAtividadesRecentesUsuario(userId, de, ate),
    ]);

  return {
    totalDoado,
    qtdTipos,
    qtdMesesComDoacao,
    labelsMes,
    valoresDoadoMes,
    valoresOngsMes,
    labelsTipo,
    valoresTipo,
    necessidadesApoiadas,
    ongsApoiadas,
    interessesCriados,
    interessesRecebidos,
    atividadesRecentes,
  };
}

export async function getOngDashboardData(ongId: number, de?: string, ate?: string) {
  const [totalRecebido, qtdDoacoes, qtdDoadores] = await Promise.all([
    dashboardRepository.getTotalRecebido(ongId, de, ate),
    dashboardRepository.getQtdDoacoes(ongId, de, ate),
    dashboardRepository.getQtdDoadores(ongId, de, ate),
  ]);

  const porMes = await dashboardRepository.getDoacoesPorMesOng(ongId, de, ate);
  const porTipo = await dashboardRepository.getDoacoesPorTipoOng(ongId, de, ate);
  const ultimasDoacoes = await dashboardRepository.getUltimasDoacoesOng(ongId, de, ate);

  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const labelsMes = porMes.map((d: any) => meses[d.mes - 1]);
  const valoresMes = porMes.map((d: any) => Number(d.total));

  const labelsTipo = porTipo.map((d: any) => d.tipo);
  const valoresTipo = porTipo.map((d: any) => Number(d.total));

  // Métricas de impacto da ONG
  const [
    necessidadesCriadas,
    necessidadesConcluidas,
    interessesPendentes,
    interessesAceitos,
    interessesRecebidos,
    necessidadesQuaseCompletas,
    necessidadeMaisAvancada,
    atividadesRecentes,
  ] = await Promise.all([
    dashboardRepository.getNecessidadesCriadasOng(ongId, de, ate),
    dashboardRepository.getNecessidadesConcluidasOng(ongId, de, ate),
    dashboardRepository.getInteressesPorStatusOng(ongId, "pendente", de, ate),
    dashboardRepository.getInteressesPorStatusOng(ongId, "aceito", de, ate),
    dashboardRepository.getInteressesPorStatusOng(ongId, "recebido", de, ate),
    dashboardRepository.getNecessidadesQuaseCompletasOng(ongId),
    dashboardRepository.getNecessidadeMaisAvancadaOng(ongId),
    dashboardRepository.getAtividadesRecentesOng(ongId, de, ate),
  ]);

  const taxaConclusao = necessidadesCriadas > 0
    ? ((necessidadesConcluidas / necessidadesCriadas) * 100).toFixed(1)
    : "0.0";

  return {
    totalRecebido: Number(totalRecebido).toFixed(2),
    qtdDoacoes: Number(qtdDoacoes),
    qtdDoadores: Number(qtdDoadores),
    labelsMes,
    valoresMes,
    labelsTipo,
    valoresTipo,
    ultimasDoacoes,
    necessidadesCriadas,
    necessidadesConcluidas,
    taxaConclusao,
    interessesPendentes,
    interessesAceitos,
    interessesRecebidos,
    necessidadesQuaseCompletas,
    necessidadeMaisAvancada,
    atividadesRecentes,
  };
}