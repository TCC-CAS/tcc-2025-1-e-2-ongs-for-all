describe('Fluxo de Doação - E2E', () => {
  const baseUrl = 'http://localhost:3000';

  beforeEach(() => {
    cy.request('POST', `${baseUrl}/login`, {
      email: 'vinicius.teste1@teste.com',
      password: '21262728',
    });
  });

  it('Deve acessar a página de doação e exibir o formulário', () => {
    cy.visit(`${baseUrl}/doacoes/nova`);
    cy.get('#btnSubmit').should('exist');
    cy.get('select[name="ong_id"]').should('exist');
    cy.get('input[name="valor"]').should('exist');
  });

  it('Deve exibir erro se enviar o formulário sem valor', () => {
    cy.visit(`${baseUrl}/doacoes/nova`);
    cy.get('select[name="ong_id"]').select('4'); // Corrigido
    cy.get('form').submit();
    cy.url().should('include', '/doacoes/nova');
  });

  it('Deve registrar uma nova doação com sucesso', () => {
    cy.visit(`${baseUrl}/doacoes/nova`);
    cy.get('select[name="ong_id"]').select('4'); // Corrigido
    cy.get('#valor').type('150.00');
    cy.get('form').submit();
    cy.url().should('include', '/dashboard');
    cy.contains('Doação realizada com sucesso!').should('exist');
  });
});
