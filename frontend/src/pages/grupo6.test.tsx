/** Regras RP, PR, CP, US e UI-01 (README, "Reprodutores, proprietários, compartilhar e usuários"). */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, type AxiosResponse } from 'axios'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '../api/client'
import { ProvedorNotificacao } from '../components/ui'
import { Compartilhar } from './Compartilhar'
import { Proprietarios } from './Proprietarios'
import { Reprodutores } from './Reprodutores'
import { Usuarios } from './Usuarios'
import { rotuloPombal } from '../formatadores'

const EU = { id: 1, login: 'davi', nome: 'Davi Fonseca', admin: true }

function erroApi(status: number, detail: unknown) {
  const e = new AxiosError('falhou')
  e.response = { status, data: { detail } } as AxiosResponse
  return e
}
function pombo(id: number, anilha: string, extra: Record<string, unknown> = {}) {
  return { id, anilha, sexo: 'M', cor: 'Azul', status: 'ATIVO', usuario_id: 1, pai_id: null, mae_id: null, proprietario: null, ...extra }
}
function montar(tela: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(['usuario-atual'], EU)
  return render(
    <QueryClientProvider client={qc}>
      <ProvedorNotificacao>
        <MemoryRouter>{tela}</MemoryRouter>
      </ProvedorNotificacao>
    </QueryClientProvider>,
  )
}
function mockGet(rotas: Record<string, unknown>) {
  return vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url in rotas) return { data: rotas[url] }
    throw new Error(url)
  })
}

afterEach(() => vi.restoreAllMocks())

describe('RP reprodutores', () => {
  const ANIZIO = { id: 5, nome: 'Anízio' }
  const PLANTEL = [
    pombo(1, '10/20', { status: 'REPRODUTOR', proprietario: ANIZIO }),
    pombo(2, '9/20', { status: 'REPRODUTOR' }),
    pombo(3, '30/20', { status: 'REPRODUTOR', sexo: 'F', cor: null }),
    pombo(4, '40/24', { pai_id: 1, mae_id: 3 }),
    pombo(5, '41/24', { pai_id: 1 }),
  ]

  it('RP-01/02: machos e fêmeas com contagem, ordem numérica, cor, proprietário e filhos', async () => {
    mockGet({ '/pombos': PLANTEL })
    montar(<Reprodutores />)
    const machos = await screen.findByRole('region', { name: 'Machos' })
    const itens = within(machos).getAllByRole('listitem')
    expect(itens.map((i) => within(i).getByRole('link').textContent)).toEqual(['9/20', '10/20'])
    expect(itens[1]).toHaveTextContent('Azul · Anízio')
    expect(itens[1]).toHaveTextContent('2 filhos')
    expect(itens[0]).toHaveTextContent('sem proprietário')
    expect(itens[0]).toHaveTextContent('0 filhos')
    expect(within(machos).getByLabelText('2 reprodutores')).toBeInTheDocument()
    const femeas = screen.getByRole('region', { name: 'Fêmeas' })
    expect(within(femeas).getByRole('listitem')).toHaveTextContent('1 filho')
    expect(screen.queryByRole('region', { name: 'Sexo não informado' })).toBeNull()
  })

  it('RP-01: terceiro cartão só com reprodutor de sexo desconhecido', async () => {
    mockGet({ '/pombos': [...PLANTEL, pombo(9, '99/20', { status: 'REPRODUTOR', sexo: 'DESCONHECIDO' })] })
    montar(<Reprodutores />)
    expect(await screen.findByRole('region', { name: 'Sexo não informado' })).toHaveTextContent('99/20')
  })

  it('RP-03: sem reprodutores explica como marcar', async () => {
    mockGet({ '/pombos': [pombo(4, '40/24')] })
    montar(<Reprodutores />)
    expect(await screen.findByText('Nenhum reprodutor ainda')).toBeInTheDocument()
    expect(screen.getByText(/Editar → Situação: Reprodutor/)).toBeInTheDocument()
  })
})

describe('PR proprietários', () => {
  const PROPS = [
    { id: 5, nome: 'Anízio', colombodromo: 'Bons Amigos', endereco: 'Rua A, 1', telefone: '11 9999', email: 'a@x.com', observacoes: 'Campeão 2024' },
    { id: 6, nome: 'Beto', colombodromo: null, endereco: null, telefone: null, email: null, observacoes: null },
  ]
  const PLANTEL = [pombo(1, '1/20', { proprietario: { id: 5, nome: 'Anízio' } }), pombo(2, '2/20', { proprietario: { id: 5, nome: 'Anízio' } })]
  const linha = (nome: string) => screen.getByText(nome, { selector: 'b' }).closest('tr')!

  it('PR-01: nome com endereço e observações, pombal, contato e número de pombos', async () => {
    mockGet({ '/proprietarios': PROPS, '/pombos': PLANTEL })
    montar(<Proprietarios />)
    await screen.findByText('Anízio', { selector: 'b' })
    const a = linha('Anízio')
    expect(a).toHaveTextContent('Rua A, 1')
    expect(a).toHaveTextContent('Campeão 2024')
    expect(a).toHaveTextContent('Bons Amigos')
    expect(a).toHaveTextContent('a@x.com')
    await waitFor(() => expect(within(a).getByLabelText('2 pombos')).toBeInTheDocument())
    expect(within(linha('Beto')).getByLabelText('0 pombos')).toBeInTheDocument()
  })

  it('PR-01: pombal sem repetir a palavra', () => {
    expect(rotuloPombal('Bons Amigos')).toBe('Pombal Bons Amigos')
    expect(rotuloPombal('Pombal Teste')).toBe('Pombal Teste')
    expect(rotuloPombal('pombal são josé ')).toBe('pombal são josé')
    expect(rotuloPombal('Pombalense')).toBe('Pombal Pombalense')
  })

  it('PR-02: novo numa janela, nome obrigatório, campos vazios viram null, erro 422 embaixo do campo', async () => {
    mockGet({ '/proprietarios': PROPS, '/pombos': PLANTEL })
    const post = vi.spyOn(api, 'post').mockRejectedValueOnce(erroApi(422, [{ loc: ['body', 'email'], msg: 'E-mail: no máximo 200 caracteres' }]))
    montar(<Proprietarios />)
    await userEvent.click(await screen.findByRole('button', { name: '+ Novo proprietário' }))
    const janela = screen.getByRole('dialog', { name: 'Novo proprietário' })
    const nome = within(janela).getByRole('textbox', { name: /Nome/ })
    expect(nome).toHaveFocus()
    expect(within(janela).getByRole('textbox', { name: 'Endereço' })).toHaveAttribute('maxLength', '300')
    expect(within(janela).getByRole('textbox', { name: 'Observações' })).toHaveAccessibleDescription(/cabeçalho do certificado/)
    await userEvent.click(within(janela).getByRole('button', { name: 'Salvar' }))
    expect(nome).toHaveAccessibleDescription(/obrigatório/)
    expect(post).not.toHaveBeenCalled()
    await userEvent.type(nome, 'Carlos')
    await userEvent.type(within(janela).getByRole('textbox', { name: 'E-mail' }), 'c@x.com')
    await userEvent.click(within(janela).getByRole('button', { name: 'Salvar' }))
    expect(await within(janela).findByText('E-mail: no máximo 200 caracteres')).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith('/proprietarios', { nome: 'Carlos', colombodromo: null, telefone: null, endereco: null, email: 'c@x.com', observacoes: null })
    post.mockResolvedValueOnce({ data: { id: 7 } })
    await userEvent.click(within(janela).getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Carlos salvo')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('PR-02: editar abre com os dados e salva com PUT', async () => {
    mockGet({ '/proprietarios': PROPS, '/pombos': PLANTEL })
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: PROPS[0] })
    montar(<Proprietarios />)
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Anízio' }))
    const janela = screen.getByRole('dialog', { name: 'Editar Anízio' })
    expect(within(janela).getByRole('textbox', { name: 'Telefone' })).toHaveValue('11 9999')
    await userEvent.click(within(janela).getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(put).toHaveBeenCalledWith('/proprietarios/5', expect.objectContaining({ nome: 'Anízio', endereco: 'Rua A, 1' })))
  })

  it('PR-03: em uso só explica; sem uso confirma; recusa do servidor aparece na janela', async () => {
    mockGet({ '/proprietarios': PROPS, '/pombos': PLANTEL })
    const del = vi.spyOn(api, 'delete').mockRejectedValueOnce(erroApi(409, 'Não é possível excluir: Beto é proprietário de 1 pombo(s).'))
    montar(<Proprietarios />)
    await screen.findByText('Anízio', { selector: 'b' })
    await waitFor(() => expect(within(linha('Anízio')).getByLabelText('2 pombos')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Excluir Anízio' }))
    const explica = screen.getByRole('dialog', { name: 'Não é possível excluir Anízio' })
    expect(explica).toHaveTextContent('proprietário de 2 pombos')
    expect(within(explica).queryByRole('button', { name: 'Excluir' })).toBeNull()
    await userEvent.click(within(explica).getByRole('button', { name: 'Entendi' }))
    await userEvent.click(screen.getByRole('button', { name: 'Excluir Beto' }))
    const confirma = screen.getByRole('alertdialog', { name: 'Excluir Beto?' })
    await userEvent.click(within(confirma).getByRole('button', { name: 'Excluir' }))
    expect(await within(confirma).findByText(/Beto é proprietário de 1 pombo/)).toBeInTheDocument()
    expect(del).toHaveBeenCalledWith('/proprietarios/6')
  })
})

describe('CP compartilhar', () => {
  const DADOS = { concedidos: [{ id: 2, nome: 'Maria Souza', login: 'maria' }], recebidos: [{ id: 3, nome: 'João Lima', login: 'joao.lima' }] }

  it('CP-01: login com rótulo; erro embaixo do campo; sucesso avisa nome e login', async () => {
    mockGet({ '/compartilhamentos': DADOS })
    const post = vi.spyOn(api, 'post').mockRejectedValueOnce(erroApi(404, 'Usuário não encontrado'))
    montar(<Compartilhar />)
    const campo = await screen.findByRole('textbox', { name: 'Login do criador' })
    await userEvent.type(campo, 'Ninguem')
    await userEvent.click(screen.getByRole('button', { name: 'Compartilhar' }))
    await waitFor(() => expect(campo).toHaveAccessibleDescription('Usuário não encontrado'))
    expect(post).toHaveBeenCalledWith('/compartilhamentos', { login: 'ninguem' })
    post.mockResolvedValueOnce({ data: { ...DADOS, concedidos: [...DADOS.concedidos, { id: 4, nome: 'Ana Reis', login: 'ana' }] } })
    await userEvent.clear(campo)
    await userEvent.type(campo, 'ana')
    await userEvent.click(screen.getByRole('button', { name: 'Compartilhar' }))
    expect(await screen.findByText('Plantel compartilhado com Ana Reis (ana)')).toBeInTheDocument()
    expect(campo).toHaveValue('')
  })

  it('CP-02: nome e login; Ver pombos; parar e deixar de ver pedem confirmação na janela', async () => {
    mockGet({ '/compartilhamentos': DADOS })
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: null })
    montar(<Compartilhar />)
    const concedidos = await screen.findByRole('region', { name: 'Quem vê o meu plantel' })
    expect(await within(concedidos).findByText('maria')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver pombos de João Lima' })).toHaveAttribute('href', '/pombos?plantel=3')
    await userEvent.click(within(concedidos).getByRole('button', { name: 'Parar de compartilhar' }))
    expect(del).not.toHaveBeenCalled()
    const janela = screen.getByRole('alertdialog', { name: 'Parar de compartilhar com Maria Souza?' })
    await userEvent.click(within(janela).getByRole('button', { name: 'Parar de compartilhar' }))
    await waitFor(() => expect(del).toHaveBeenCalledWith('/compartilhamentos/concedidos/2'))
    await userEvent.click(screen.getByRole('button', { name: 'Deixar de ver' }))
    await userEvent.click(within(screen.getByRole('alertdialog', { name: 'Deixar de ver o plantel de João Lima?' })).getByRole('button', { name: 'Deixar de ver' }))
    await waitFor(() => expect(del).toHaveBeenCalledWith('/compartilhamentos/recebidos/3'))
  })
})

describe('US usuários', () => {
  const LISTA = [
    { id: 1, login: 'davi', nome: 'Davi Fonseca', admin: true, ativo: true, bloqueado: false, total_pombos: 27, ultimo_acesso: null },
    { id: 2, login: 'maria', nome: 'Maria Souza', admin: false, ativo: true, bloqueado: true, total_pombos: 1, ultimo_acesso: null },
    { id: 3, login: 'beto', nome: 'Beto Reis', admin: false, ativo: false, bloqueado: false, total_pombos: 0, ultimo_acesso: null },
  ]
  const cartao = (nome: string) => screen.getByText(nome, { selector: 'b' }).closest('li')!

  it('US-01: cartões com selos; novo usuário em janela com erro 409 no campo login', async () => {
    mockGet({ '/usuarios': LISTA })
    const post = vi.spyOn(api, 'post').mockRejectedValueOnce(erroApi(409, 'Já existe um usuário com esse login'))
    montar(<Usuarios />)
    await screen.findByText('Maria Souza', { selector: 'b' })
    expect(cartao('Maria Souza')).toHaveTextContent('bloqueado')
    expect(cartao('Beto Reis')).toHaveTextContent('desativado')
    expect(cartao('Davi Fonseca')).toHaveTextContent('(você)')
    expect(within(cartao('Davi Fonseca')).queryByRole('button', { name: /Desativar|admin/ })).toBeNull() // regra 8
    await userEvent.click(screen.getByRole('button', { name: '+ Novo usuário' }))
    const janela = screen.getByRole('dialog', { name: 'Novo usuário' })
    await userEvent.type(within(janela).getByRole('textbox', { name: /Nome completo/ }), 'Ana Reis')
    await userEvent.type(within(janela).getByRole('textbox', { name: /Login/ }), 'Maria')
    await userEvent.type(within(janela).getByRole('textbox', { name: /Senha/ }), '12345678')
    await userEvent.click(within(janela).getByRole('button', { name: 'Criar' }))
    await waitFor(() => expect(within(janela).getByRole('textbox', { name: /Login/ })).toHaveAccessibleDescription(/Já existe um usuário com esse login/))
    expect(post).toHaveBeenCalledWith('/usuarios', { nome: 'Ana Reis', login: 'maria', senha: '12345678', admin: false })
    post.mockResolvedValueOnce({ data: { login: 'ana', nome: 'Ana Reis' } })
    await userEvent.clear(within(janela).getByRole('textbox', { name: /Login/ }))
    await userEvent.type(within(janela).getByRole('textbox', { name: /Login/ }), 'ana')
    await userEvent.click(within(janela).getByRole('button', { name: 'Criar' }))
    expect(await screen.findByText(/Usuário ana criado — passe o login e a senha para Ana Reis/)).toBeInTheDocument()
  })

  it('US-02: desativar e tornar admin pedem confirmação; reativar e desbloquear são diretos', async () => {
    mockGet({ '/usuarios': LISTA })
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: {} })
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: null })
    montar(<Usuarios />)
    await screen.findByText('Maria Souza', { selector: 'b' })
    await userEvent.click(within(cartao('Maria Souza')).getByRole('button', { name: 'Desativar' }))
    expect(patch).not.toHaveBeenCalled()
    const janela = screen.getByRole('alertdialog', { name: 'Desativar Maria Souza?' })
    expect(janela).toHaveTextContent('O plantel é mantido')
    await userEvent.click(within(janela).getByRole('button', { name: 'Desativar' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/usuarios/2', { ativo: false }))
    await userEvent.click(within(cartao('Maria Souza')).getByRole('button', { name: 'Tornar admin' }))
    await userEvent.click(within(screen.getByRole('alertdialog', { name: 'Tornar Maria Souza administrador?' })).getByRole('button', { name: 'Tornar admin' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/usuarios/2', { admin: true }))
    await userEvent.click(within(cartao('Beto Reis')).getByRole('button', { name: 'Reativar' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/usuarios/3', { ativo: true }))
    await userEvent.click(within(cartao('Maria Souza')).getByRole('button', { name: 'Desbloquear' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/usuarios/2/desbloquear'))
  })

  it('US-02: redefinir senha numa janela; erro do servidor embaixo do campo', async () => {
    mockGet({ '/usuarios': LISTA })
    const post = vi.spyOn(api, 'post').mockRejectedValueOnce(erroApi(422, [{ loc: ['body', 'senha'], msg: 'A senha precisa ter pelo menos 8 caracteres' }]))
    montar(<Usuarios />)
    await screen.findByText('Maria Souza', { selector: 'b' })
    await userEvent.click(within(cartao('Maria Souza')).getByRole('button', { name: 'Redefinir senha' }))
    const janela = screen.getByRole('dialog', { name: 'Redefinir a senha de Maria Souza' })
    const campo = within(janela).getByRole('textbox', { name: /Nova senha/ })
    expect(campo).toHaveFocus()
    await userEvent.type(campo, 'curta')
    await userEvent.click(within(janela).getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(campo).toHaveAccessibleDescription(/pelo menos 8 caracteres/))
    expect(post).toHaveBeenCalledWith('/usuarios/2/senha', { senha: 'curta' })
  })
})

describe('UI-01', () => {
  it('nenhuma tela usa alert(), confirm() ou prompt() do navegador', () => {
    const fontes = import.meta.glob(['../**/*.tsx', '../**/*.ts', '!../**/*.test.*'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    expect(Object.keys(fontes).length).toBeGreaterThan(20)
    const usos = Object.entries(fontes).flatMap(([arquivo, codigo]) =>
      codigo
        .split('\n')
        .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l) && /(^|[^.\w])(window\.)?(alert|confirm|prompt)\(/.test(l))
        .map((l) => `${arquivo}: ${l.trim()}`),
    )
    expect(usos).toEqual([])
  })
})
