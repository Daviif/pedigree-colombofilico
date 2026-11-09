/** Regras NV-01..06 (README, "Navegação e busca"). */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosRequestConfig } from 'axios'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '../api/client'
import type { Pombo } from '../api/types'
import { Layout } from './Layout'
import { Migalhas } from './ui'

const POMBOS: Partial<Pombo>[] = [
  { id: 1, anilha: '4272402/24', sexo: 'M', cor: 'Escama', usuario_id: 1, dono: { id: 1, nome: 'Davi Fonseca' } },
  { id: 2, anilha: '4272403/24', sexo: 'F', cor: 'Azul', usuario_id: 1, dono: { id: 1, nome: 'Davi Fonseca' } },
]

function usuario(admin: boolean) {
  return { id: 1, login: 'davi', nome: 'Davi Fonseca', admin }
}

function mockApi(admin = false, pombos = POMBOS) {
  return vi.spyOn(api, 'get').mockImplementation(async (url: string, config?: AxiosRequestConfig) => {
    if (url === '/auth/me') return { data: usuario(admin) }
    if (url === '/pombos') {
      const q = (config?.params as { anilha?: string } | undefined)?.anilha ?? ''
      return { data: pombos.filter((p) => p.anilha!.includes(q)) }
    }
    throw new Error(`url inesperada ${url}`)
  })
}

function Onde() {
  const l = useLocation()
  return <output data-testid="onde">{l.pathname + l.search}</output>
}

function montar(rota = '/') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[rota]}>
        <Layout>
          <Routes>
            <Route path="*" element={<Onde />} />
          </Routes>
        </Layout>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const menuPrincipal = () => screen.getByRole('navigation', { name: 'Principal' })

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: q.includes('min-width'), media: q, addEventListener() {}, removeEventListener() {} }))
})
afterEach(() => vi.restoreAllMocks())

describe('NV-01 menu superior', () => {
  it('criador vê os 5 itens, sem Usuários', async () => {
    mockApi(false)
    montar()
    await waitFor(() => expect(screen.getByRole('button', { name: /Conta de Davi Fonseca/ })).toBeInTheDocument())
    const itens = within(menuPrincipal()).getAllByRole('link').map((a) => a.textContent)
    expect(itens).toEqual(['Início', 'Meus pombos', 'Reprodutores', 'Proprietários', 'Compartilhar'])
  })

  it('admin vê também Usuários', async () => {
    mockApi(true)
    montar()
    expect(await within(menuPrincipal()).findByRole('link', { name: /Usuários/ })).toHaveAttribute('href', '/usuarios')
  })

  it('a página atual fica marcada com aria-current', async () => {
    mockApi()
    montar('/pombos/7')
    expect(within(menuPrincipal()).getByRole('link', { name: 'Meus pombos' })).toHaveAttribute('aria-current', 'page')
    expect(within(menuPrincipal()).getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current')
  })
})

describe('NV-02 gaveta no celular', () => {
  it('abre pelo ☰, navega e fecha', async () => {
    mockApi()
    montar()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
    const gaveta = screen.getByRole('navigation', { name: 'Menu' })
    await userEvent.click(within(gaveta).getByRole('link', { name: 'Compartilhar' }))
    expect(screen.getByTestId('onde')).toHaveTextContent('/compartilhar')
    expect(screen.queryByRole('navigation', { name: 'Menu' })).toBeNull()
  })

  it('Esc fecha a gaveta', async () => {
    mockApi()
    montar()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('navigation', { name: 'Menu' })).toBeNull()
  })
})

describe('NV-03/04 busca por anilha', () => {
  it('"/" leva o cursor à busca', async () => {
    mockApi()
    montar()
    await userEvent.keyboard('/')
    expect(screen.getAllByRole('combobox', { name: 'Buscar pombo pela anilha' })[0]).toHaveFocus()
  })

  it('"/" não rouba o foco de quem está digitando em outro campo', async () => {
    mockApi()
    render(<input aria-label="outro" />)
    montar()
    const outro = screen.getByLabelText('outro')
    await userEvent.type(outro, 'a/b')
    expect(outro).toHaveValue('a/b')
    expect(outro).toHaveFocus()
  })

  it('digitar mostra resultados com sexo e cor; Enter abre o primeiro (2 ações)', async () => {
    mockApi()
    montar()
    const busca = screen.getAllByRole('combobox')[0]
    await userEvent.type(busca, '42724')
    const opcoes = await screen.findAllByRole('option')
    expect(opcoes).toHaveLength(2)
    expect(opcoes[0]).toHaveTextContent('4272402/24')
    expect(opcoes[1]).toHaveTextContent('Fêmea · Azul')
    await userEvent.keyboard('{Enter}')
    expect(screen.getByTestId('onde')).toHaveTextContent('/pombos/1')
  })

  it('↓ escolhe o seguinte e Esc limpa', async () => {
    mockApi()
    montar()
    const busca = screen.getAllByRole('combobox')[0]
    await userEvent.type(busca, '42724')
    await screen.findAllByRole('option')
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{Enter}')
    expect(screen.getByTestId('onde')).toHaveTextContent('/pombos/2')
    await userEvent.type(busca, '427{Escape}')
    expect(busca).toHaveValue('')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('mesma anilha em outro plantel mostra de quem é', async () => {
    mockApi(false, [
      POMBOS[0],
      { id: 9, anilha: '4272402/24', sexo: 'M', cor: 'Escama', usuario_id: 7, dono: { id: 7, nome: 'João Lima' } },
    ])
    montar()
    await userEvent.type(screen.getAllByRole('combobox')[0], '4272402')
    const opcoes = await screen.findAllByRole('option')
    expect(opcoes[0]).not.toHaveTextContent('Plantel de')
    expect(opcoes[1]).toHaveTextContent('Plantel de João Lima')
  })

  it('o próprio plantel vem primeiro: Enter abre o meu, mesmo com o de outro antes na API', async () => {
    const outros = Array.from({ length: 9 }, (_, i) => ({ id: 20 + i, anilha: `4272402/${10 + i}`, sexo: 'M' as const, cor: null, usuario_id: 7, dono: { id: 7, nome: 'João Lima' } }))
    mockApi(false, [...outros, { ...POMBOS[0], anilha: '4272402/24' }])
    montar()
    await userEvent.type(screen.getAllByRole('combobox')[0], '4272402')
    const opcoes = await screen.findAllByRole('option')
    expect(opcoes).toHaveLength(8)
    expect(opcoes[0]).not.toHaveTextContent('Plantel de') // o meu, apesar de vir por último e além do 8º
    expect(opcoes[1]).toHaveTextContent('4272402/10')
    await userEvent.keyboard('{Enter}')
    expect(screen.getByTestId('onde')).toHaveTextContent(`/pombos/${POMBOS[0].id}`)
  })

  it('mostra no máximo 8 resultados', async () => {
    mockApi(false, Array.from({ length: 12 }, (_, i) => ({ id: i + 1, anilha: `1${i}/26`, sexo: 'M' as const, cor: null, usuario_id: 1, dono: { id: 1, nome: 'Davi Fonseca' } })))
    montar()
    await userEvent.type(screen.getAllByRole('combobox')[0], '1')
    expect(await screen.findAllByRole('option')).toHaveLength(8)
  })
})

describe('NV-05 sem resultado', () => {
  it('oferece cadastrar com a anilha preenchida', async () => {
    mockApi()
    montar()
    await userEvent.type(screen.getAllByRole('combobox')[0], '999/26')
    const opcao = await screen.findByRole('option', { name: /Nenhum pombo com 999\/26/ })
    await userEvent.click(opcao)
    expect(screen.getByTestId('onde')).toHaveTextContent('/pombos/novo?anilha=999%2F26')
  })

  it('texto que não é anilha não oferece cadastrar', async () => {
    mockApi()
    montar()
    await userEvent.type(screen.getAllByRole('combobox')[0], 'azul')
    expect(await screen.findByText(/A anilha tem só números e \//)).toBeInTheDocument()
    expect(screen.queryByRole('option')).toBeNull()
  })
})

describe('NV-06 caminho no topo', () => {
  it('último item é a página atual e não é link', () => {
    render(
      <MemoryRouter>
        <Migalhas itens={[{ rotulo: 'Início', para: '/' }, { rotulo: 'Meus pombos', para: '/pombos' }, { rotulo: '4272402/24' }]} />
      </MemoryRouter>,
    )
    const caminho = screen.getByRole('navigation', { name: 'Caminho' })
    expect(within(caminho).getAllByRole('link').map((a) => a.textContent)).toEqual(['Início', 'Meus pombos'])
    expect(within(caminho).getByText('4272402/24')).toHaveAttribute('aria-current', 'page')
  })
})
