/** Regras IN-01..05 e LI-01..06 (README, "Início e lista de pombos"). */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, type AxiosRequestConfig } from 'axios'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '../api/client'
import type { Pombo } from '../api/types'
import { Dashboard } from './Dashboard'
import { PombosList } from './pombos/PombosList'

const dono = { id: 1, nome: 'Davi Fonseca' }
function pombo(id: number, anilha: string, extra: Partial<Pombo> = {}): Pombo {
  return { id, anilha, sexo: 'M', cor: 'Azul', status: 'ATIVO', usuario_id: 1, dono, pai: null, mae: null, pai_id: null, mae_id: null, proprietario: null, ...extra } as Pombo
}
const PAI = pombo(1, '10/20', { status: 'REPRODUTOR' })
const MAE = pombo(2, '2/20', { sexo: 'F', cor: 'Escama' })
const FILHO = pombo(3, '100/24', { pai: PAI, mae: MAE, pai_id: 1, mae_id: 2, proprietario: { id: 5, nome: 'Anízio' } })
const PADRAO = [FILHO, PAI, MAE]

type Rotas = { pombos?: Pombo[]; recentes?: unknown[]; admin?: boolean; recebidos?: unknown[] }
function mockApi({ pombos = PADRAO, recentes = [], admin = false, recebidos = [] }: Rotas = {}) {
  return vi.spyOn(api, 'get').mockImplementation(async (url: string, config?: AxiosRequestConfig) => {
    const params = (config?.params ?? {}) as Record<string, string | number | undefined>
    if (url === '/auth/me') return { data: { id: 1, login: 'davi', nome: 'Davi Fonseca', admin } }
    if (url === '/compartilhamentos') return { data: { concedidos: [], recebidos } }
    if (url === '/proprietarios') return { data: [{ id: 5, nome: 'Anízio' }] }
    if (url === '/resultados/recentes') return { data: recentes }
    if (url === '/pombos') {
      let lista = pombos
      if (params.anilha) lista = lista.filter((p) => p.anilha.includes(String(params.anilha)))
      if (params.sexo) lista = lista.filter((p) => p.sexo === params.sexo)
      return { data: lista }
    }
    throw new Error(`url inesperada ${url}`)
  })
}

function Onde() {
  const l = useLocation()
  return <output data-testid="onde">{l.pathname + l.search}</output>
}

function montar(elemento: React.ReactElement, rota = '/') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(['usuario-atual'], { id: 1, login: 'davi', nome: 'Davi Fonseca', admin: false })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/" element={elemento} />
          <Route path="/pombos" element={elemento} />
          <Route path="*" element={<Onde />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('Início', () => {
  it('IN-01 cumprimenta pelo primeiro nome e pela hora', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 9, 15, 0))
    mockApi()
    montar(<Dashboard />)
    expect(screen.getByRole('heading', { name: 'Boa tarde, Davi!' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Buscar pombo pela anilha' })).toBeInTheDocument()
  })

  it('IN-02 números do plantel, com pedigree incompleto levando à lista filtrada', async () => {
    mockApi()
    montar(<Dashboard />)
    const pombos = await screen.findByRole('link', { name: /3\s*Pombos/ })
    expect(pombos).toHaveAttribute('href', '/pombos')
    expect(screen.getByRole('link', { name: /1\s*Reprodutores/ })).toHaveAttribute('href', '/reprodutores')
    expect(screen.getByRole('link', { name: /2\s*Pedigree incompleto/ })).toHaveAttribute('href', '/pombos?incompleto=1')
  })

  it('IN-03 últimos cadastrados com rótulos legíveis (maior id primeiro)', async () => {
    mockApi()
    montar(<Dashboard />)
    const secao = (await screen.findByRole('heading', { name: 'Últimos cadastrados' })).closest('section')!
    const itens = await within(secao).findAllByRole('listitem')
    expect(itens[0]).toHaveTextContent('100/24')
    expect(itens[0]).toHaveTextContent('Macho')
    expect(within(secao).getByText('Reprodutor')).toBeInTheDocument()
    expect(within(secao).queryByText('REPRODUTOR')).toBeNull()
  })

  it('IN-04 últimos resultados com link para o pombo; vazio explica onde registrar', async () => {
    mockApi({ recentes: [{ id: 9, pombo_id: 3, anilha: '100/24', ano: 2025, competicao: 'Prova Navarro', colocacao: '1º' }] })
    montar(<Dashboard />)
    expect(await screen.findByText('1º — Prova Navarro')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '100/24' })).toHaveAttribute('href', '/pombos/3')
  })

  it('IN-04 sem resultados mostra a orientação', async () => {
    mockApi()
    montar(<Dashboard />)
    expect(await screen.findByText(/Nenhum resultado registrado ainda/)).toBeInTheDocument()
  })

  it('IN-05 crédito da foto (CC BY-SA)', () => {
    mockApi()
    montar(<Dashboard />)
    expect(screen.getByRole('link', { name: 'CC BY-SA 2.0' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-sa/2.0/')
    expect(screen.getByRole('link', { name: /RATAEDL/ })).toBeInTheDocument()
  })
})

describe('Lista de pombos', () => {
  it('LI-01 filtros com rótulo; Plantel só aparece com outros plantéis', async () => {
    mockApi()
    montar(<PombosList />, '/pombos')
    for (const r of ['Anilha', 'Cor', 'Sexo', 'Situação', 'Proprietário']) expect(screen.getByLabelText(r)).toBeInTheDocument()
    expect(screen.queryByLabelText('Plantel')).toBeNull()
  })

  it('LI-01 Plantel aparece quando há plantel compartilhado comigo', async () => {
    mockApi({ recebidos: [{ id: 7, nome: 'João Lima', login: 'joao' }] })
    montar(<PombosList />, '/pombos')
    expect(await screen.findByLabelText('Plantel')).toHaveTextContent('Plantel de João Lima (joao)')
  })

  it('LI-02 e LI-03 contagem e ordem numérica da anilha, invertível', async () => {
    mockApi()
    montar(<PombosList />, '/pombos')
    expect(await screen.findByText('3 pombos no seu plantel')).toBeInTheDocument()
    const tabela = screen.getByRole('table')
    const anilhas = () => within(tabela).getAllByRole('row').slice(1).map((l) => within(l).getAllByRole('cell')[0].textContent)
    expect(anilhas()).toEqual(['2/20', '10/20', '100/24'])
    await userEvent.click(within(tabela).getByRole('button', { name: /Anilha/ }))
    expect(anilhas()).toEqual(['100/24', '10/20', '2/20'])
    expect(within(tabela).getByRole('columnheader', { name: /Anilha/ })).toHaveAttribute('aria-sort', 'descending')
  })

  it('LI-04 sexo e situação legíveis; pai e mãe são links', async () => {
    mockApi()
    montar(<PombosList />, '/pombos')
    const tabela = await screen.findByRole('table')
    const linha = within(tabela).getAllByRole('row').find((l) => l.textContent?.includes('100/24'))!
    expect(linha).toHaveTextContent('Macho')
    expect(linha).toHaveTextContent('Ativo')
    expect(within(linha).getByRole('link', { name: '10/20' })).toHaveAttribute('href', '/pombos/1')
    expect(within(linha).getByRole('link', { name: '2/20' })).toHaveAttribute('href', '/pombos/2')
  })

  it('LI-02 no erro de carregamento não mostra "0 pombos"', async () => {
    mockApi()
    const get = vi.mocked(api.get)
    const original = get.getMockImplementation()!
    get.mockImplementation(async (url: string, cfg?: unknown) => {
      if (url === '/pombos') throw new AxiosError('Network Error', 'ERR_NETWORK')
      return original(url, cfg as never)
    })
    montar(<PombosList />, '/pombos')
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
    expect(screen.queryByText(/\d+ pombos?\b/)).toBeNull()
  })

  it('LI-05 plantel vazio oferece cadastrar o primeiro', async () => {
    mockApi({ pombos: [] })
    montar(<PombosList />, '/pombos')
    expect(await screen.findByText('Nenhum pombo cadastrado ainda')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+ Cadastrar o primeiro' })).toHaveAttribute('href', '/pombos/novo')
  })

  it('LI-05 filtro sem resultado oferece limpar', async () => {
    mockApi()
    montar(<PombosList />, '/pombos')
    await userEvent.type(screen.getByLabelText('Anilha'), '999')
    expect(await screen.findByText('Nenhum pombo com esses filtros')).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Limpar filtros' }).at(-1)!)
    expect(screen.getByLabelText('Anilha')).toHaveValue('')
    expect(await screen.findByText('3 pombos no seu plantel')).toBeInTheDocument()
  })

  it('LI-06 ?incompleto=1 mostra só sem pai ou mãe e permite ver todos', async () => {
    mockApi()
    montar(<PombosList />, '/pombos?incompleto=1')
    expect(await screen.findByText('2 pombos no seu plantel')).toBeInTheDocument()
    expect(screen.queryByText('100/24')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Ver todos' }))
    expect(await screen.findByText('3 pombos no seu plantel')).toBeInTheDocument()
  })
})
