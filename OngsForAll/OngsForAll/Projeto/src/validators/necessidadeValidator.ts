type NecessidadeInput = {
  titulo?: string;
  descricao?: string;
  categoria?: string;
  quantidade?: number;
};

export function validateNecessidade(data: NecessidadeInput) {
  const errors: string[] = [];

  const titulo = data.titulo?.trim();
  const descricao = data.descricao?.trim();
  const categoria = data.categoria?.trim();
  const quantidade = Number(data.quantidade);

  if (!titulo || titulo.length < 3) {
    errors.push("O título deve ter pelo menos 3 caracteres.");
  }

  if (!descricao || descricao.length < 10) {
    errors.push("A descrição deve ter pelo menos 10 caracteres.");
  }

  if (!categoria || categoria.length === 0) {
    errors.push("Informe a categoria.");
  }

  if (Number.isNaN(quantidade) || quantidade < 1) {
    errors.push("A quantidade deve ser maior que zero.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

const STATUS_VALIDOS = ["aberta", "em_andamento", "concluida", "cancelada"];

export function validateStatus(status?: string) {
  if (!status || !STATUS_VALIDOS.includes(status)) {
    return { isValid: false, error: "Status inválido." };
  }
  return { isValid: true, error: null };
}
