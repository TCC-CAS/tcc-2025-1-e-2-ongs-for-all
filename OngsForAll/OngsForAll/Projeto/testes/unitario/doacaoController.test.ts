import {
  renderNovaDoacaoPage,
  criarDoacao,
  totalDoacoesPorOng
} from '../../src/controllers/doacaoController';

let mockQuery: jest.Mock = jest.fn();

const mockRedirect = jest.fn();
const mockView = jest.fn();
const mockSend = jest.fn();
const mockCode = jest.fn();

const mockReply = {
  redirect: mockRedirect,
  view: mockView,
  send: mockSend,
  code: mockCode
} as any;

// Simula encadeamento: .code().send()
mockCode.mockImplementation(() => ({ send: mockSend }));

jest.mock('../../src/config/ds', () => ({
  pool: {
    query: (...args: any[]) => mockQuery(...args)
  }
}));

beforeEach(() => {
  mockQuery.mockReset();
  mockRedirect.mockReset();
  mockView.mockReset();
  mockSend.mockReset();
  mockCode.mockReset();
  mockCode.mockImplementation(() => ({ send: mockSend }));
});

describe('renderNovaDoacaoPage', () => {
  it('deve redirecionar para login se não houver sessão', async () => {
    const mockRequest = { session: {} } as any;

    await renderNovaDoacaoPage(mockRequest, mockReply);
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('deve retornar os dados com sucesso (modo teste)', async () => {
    const mockRequest = {
      session: { user: { id: 1, nome: 'João' } }
    } as any;

    const ongs = [
      { ong_id: 1, nome: 'ONG A' },
      { ong_id: 2, nome: 'ONG B' }
    ];

    mockQuery.mockResolvedValueOnce([ongs]);

    await renderNovaDoacaoPage(mockRequest, mockReply);

    expect(mockQuery).toHaveBeenCalledWith('SELECT ong_id, nome FROM ongs');
    expect(mockSend).toHaveBeenCalledWith({
      user: mockRequest.session.user,
      ongs
    });
  });
});

describe('criarDoacao', () => {
  it('deve redirecionar para login se o usuário não estiver autenticado', async () => {
    const mockRequest = { session: {} } as any;

    await criarDoacao(mockRequest, mockReply);
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('deve recusar doação se usuário for inválido', async () => {
    const mockRequest = {
      session: { user: { id: 999 } },
      body: { valor: '50,00', tipo: 'Saúde', ong_id: 1 }
    } as any;

    mockQuery.mockResolvedValueOnce([[]]);

    await criarDoacao(mockRequest, mockReply);

    expect(mockCode).toHaveBeenCalledWith(403);
    expect(mockSend).toHaveBeenCalledWith('Apenas usuários podem realizar doações.');
  });

  it('deve registrar a doação com sucesso', async () => {
    const mockRequest = {
      session: { user: { id: 123 } },
      body: { valor: '50,00', tipo: 'Educação', ong_id: 2 }
    } as any;

    mockQuery
      .mockResolvedValueOnce([[{ id: 123 }]])
      .mockResolvedValueOnce(undefined);

    await criarDoacao(mockRequest, mockReply);

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO doacoes'),
      [123, 50.0, 'Educação', 2]
    );
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard?sucesso=1');
  });
});

describe('totalDoacoesPorOng', () => {
  it('deve retornar os dados corretamente em ambiente de teste', async () => {
    const mockRequest = {} as any;

    const dadosMock = [
      { nome: 'ONG A', total: 200 },
      { nome: 'ONG B', total: 150 }
    ];

    mockQuery.mockResolvedValueOnce([dadosMock]);

    await totalDoacoesPorOng(mockRequest, mockReply);

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT ongs.nome'));
    expect(mockSend).toHaveBeenCalledWith({ dados: dadosMock });
  });

  it('deve retornar erro 500 se a consulta falhar', async () => {
    const mockRequest = {} as any;

    mockQuery.mockRejectedValueOnce(new Error('Falha ao buscar'));

    await totalDoacoesPorOng(mockRequest, mockReply);

    expect(mockCode).toHaveBeenCalledWith(500);
    expect(mockSend).toHaveBeenCalledWith('Erro ao buscar totais das ONGs');
  });
});