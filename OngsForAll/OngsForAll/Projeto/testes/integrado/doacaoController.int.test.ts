import Fastify, { FastifyRequest, FastifyReply } from 'fastify'
import fastifyView from '@fastify/view'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import * as path from 'path'
import handlebars from 'handlebars'
import { pool } from '../../src/config/ds'
import {
  criarDoacao,
  renderNovaDoacaoPage,
  listarHistoricoDoacoes
} from '../../src/controllers/doacaoController'

let app: any
const testUserId = 10101
const testOngId = 20202

beforeAll(async () => {
  app = Fastify()

  app.register(fastifyCookie)
  app.register(fastifySession, {
    secret: '12345678901234567890123456789012',
    cookie: { secure: false }
  })

  app.register(fastifyView, {
    engine: { handlebars },
    root: path.join(__dirname, '../../src/views/templates'),
    layout: false
  })

  // Rotas simuladas
  app.post('/doar', async (request: FastifyRequest, reply: FastifyReply) => {
    request.session.user = { id: testUserId, nome: 'Usuário Teste', email: 'user@teste.com' }
    return criarDoacao(request, reply)
  })

  app.get('/nova-doacao', async (request: FastifyRequest, reply: FastifyReply) => {
    request.session.user = { id: testUserId, nome: 'Usuário Teste', email: 'user@teste.com' }
    return renderNovaDoacaoPage(request, reply)
  })

  app.get('/historico', async (request: FastifyRequest, reply: FastifyReply) => {
    request.session.user = { id: testUserId, nome: 'Usuário Teste', email: 'user@teste.com' }
    return listarHistoricoDoacoes(request, reply)
  })

  // Dados fictícios
  await pool.query(`
    INSERT INTO usuarios (id, nome, email, senha, cpf, telefone)
    VALUES (?, 'Usuário Teste', 'user@teste.com', '123', '12345678901', '11999999999')
  `, [testUserId])

  await pool.query(`
    INSERT INTO ongs (ong_id, nome, email, senha, cnpj, area_atuacao, telefone)
    VALUES (?, 'ONG Teste', 'ong@teste.com', '123', '12345678000199', 'Educação', '11999999998')
  `, [testOngId])

  await app.ready()
})

afterAll(async () => {
  await pool.query(`DELETE FROM doacoes WHERE usuario_id = ?`, [testUserId])
  await pool.query(`DELETE FROM usuarios WHERE id = ?`, [testUserId])
  await pool.query(`DELETE FROM ongs WHERE ong_id = ?`, [testOngId])
  await app.close()
})

describe('Integração - DoacaoController', () => {
  it('criarDoacao → deve criar e redirecionar', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/doar',
      payload: {
        valor: '250,75',
        tipo: 'Pix',
        ong_id: testOngId
      }
    })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/dashboard?sucesso=1')

    const [rows]: any = await pool.query(
      `SELECT * FROM doacoes WHERE usuario_id = ? ORDER BY data DESC LIMIT 1`,
      [testUserId]
    )

    expect(rows.length).toBe(1)
    expect(parseFloat(rows[0].valor)).toBeCloseTo(250.75) // ✅ Corrigido
    expect(rows[0].tipo).toBe('Pix')
    expect(rows[0].ong_id).toBe(testOngId)
  })

  it('renderNovaDoacaoPage → deve exibir formulário com lista de ONGs', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/nova-doacao'
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain('ONG Teste') // Exibe a ONG no HTML
  })

  it('listarHistoricoDoacoes → deve exibir doações do usuário', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/historico'
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain('ONG Teste')     // Nome da ONG
    expect(response.body).toContain('Pix')           // Tipo de pagamento
    expect(response.body).toMatch(/\d{2}\/\d{2}\/\d{4}/) // Data formatada
  })
})
