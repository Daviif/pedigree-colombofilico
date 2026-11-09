/** Regras DT-01..06 e AR-02..06 (README, "Detalhe do pombo e árvore"). */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, type AxiosResponse } from 'axios'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '../../api/client'
import type { ArvoreNo, Resultado } from '../../api/types'
import { ProvedorNotificacao } from '../../components/ui'
import { PomboDetail } from './PomboDetail'

const EU = { id: 1, login: 'davi', nome: 'Davi Fonseca', admin: false }
const OUTRA = { id: 2, nome: 'Maria Souza' }

function pombo(extra: Record<string, unknown> = {}) {
  return {
    id: 10, anilha: '4272402/24', sexo: 'M', cor: 'Escama', status: 'ATIVO', usuario_id: 1, dono: { id: 1, nome: EU.nome },
    pai: null, mae: null, pai_id: 11, mae_id: null, proprietario: { id: 5, nome: 'Anízio', colombodromo: 'São José' },
    observacoes: 'Bom de fundo', origem: 'Compra', resultados: [{ id: 1 }, { id: 2 }], ...extra,
  }
}
function no(id: number, anilha: string, extra: Partial<ArvoreNo> = {}): ArvoreNo {
  return { id, anilha, sexo: 'M', cor: 'Azul', duplicado: false, alerta_sexo: false, resultados: [], pai: null, mae: null, ...extra }
}
const AVO = no(12, '500/19', { duplicado: true })
const ARVORE = no(10, '4272402/24', { cor: 'Escama', pai: no(11, '300/22', { pai: AVO, mae: no(13, '600/19', { sexo: 'M', alerta_sexo: true }) }) })
const RESULTADOS: Resultado[] = [
  { id: 1, pombo_id: 10, ano: 2023, competicao: 'Prova Antiga', distancia_km: 300, colocacao: '5º', premio: null, observacao: null },
  { id: 2, pombo_id: 10, ano: 2025, competicao: 'Prova Nova', distancia_km: 500, colocacao: '1º', premio: 'Troféu', observacao: null },
]

function erroApi(status: number, detail: unknown) {
  const e = new AxiosError('falhou')
  e.response = { status, data: { detail } } as AxiosResponse
  return e
}

function mockGet(detalhe = pombo(), arvore = ARVORE) {
  return vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url === '/pombos/10') return { data: detalhe }
    if (url === '/pombos/10/arvore') return { data: arvore }
    if (url === '/pombos/10/irmaos') return { data: { completos: [{ id: 30, anilha: '4272403/24', sexo: 'F', cor: 'Azul' }], meios_paternos: [], meios_maternos: [] } }
    if (url === '/pombos/10/resultados') return { data: RESULTADOS }
    if (url === '/pombos') return { data: [{ id: 20, anilha: '777/20', sexo: 'F', cor: 'Vermelha' }, { id: 21, anilha: '888/20', sexo: 'M', cor: null }] }
    throw new Error(url)
  })
}

function Onde() {
  return <output data-testid="onde">{useLocation().pathname}</output>
}

function montar(usuario = EU) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(['usuario-atual'], usuario)
  return render(
    <QueryClientProvider client={qc}>
      <ProvedorNotificacao>
        <MemoryRouter initialEntries={['/pombos/10']}>
          <Routes>
            <Route path="/pombos/:id" element={<PomboDetail />} />
            <Route path="*" element={<Onde />} />
          </Routes>
        </MemoryRouter>
      </ProvedorNotificacao>
    </QueryClientProvider>,
  )
}

const colunas = () => document.querySelector<HTMLElement>('[data-vista="colunas"]')!
const celular = () => document.querySelector<HTMLElement>('[data-vista="celular"]')!

afterEach(() => vi.restoreAllMocks())

describe('DT-01 / DT-02 faixa e ações', () => {
  it('meu pombo: anilha, sexo, cor, situação, proprietário; PDF, Editar e ⋯', async () => {
    mockGet()
    montar()
    expect(await screen.findByRole('heading', { level: 1, name: '4272402/24' })).toBeInTheDocument()
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'Proprietário: Anízio · Pombal São José')).toBeInTheDocument()
    expect(screen.getByText('Escama')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Certificado PDF/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Editar' })).toHaveAttribute('href', '/pombos/10/editar')
    await userEvent.click(screen.getByRole('button', { name: 'Mais ações' }))
    expect(screen.getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['Copiar anilha', 'Excluir pombo…'])
    expect(screen.queryByText(/só leitura|não alterá-lo/i)).toBeNull()
  })

  it('plantel de outra pessoa: aviso de só leitura e "Copiar para meu plantel" no lugar de Editar e ⋯', async () => {
    mockGet(pombo({ usuario_id: 2, dono: OUTRA }))
    montar()
    expect(await screen.findByText('Plantel de Maria Souza')).toBeInTheDocument()
    expect(screen.getByText('Só leitura')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copiar para meu plantel' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Editar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Mais ações' })).toBeNull()
  })

  it('admin vendo plantel de outra pessoa pode editar', async () => {
    mockGet(pombo({ usuario_id: 2, dono: OUTRA }))
    montar({ ...EU, admin: true })
    expect(await screen.findByText(/você edita como administrador/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Editar' })).toBeInTheDocument()
  })

  it('pombo inexistente mostra "não encontrado"', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(erroApi(404, 'Pombo não encontrado'))
    montar()
    expect(await screen.findByText('Pombo não encontrado')).toBeInTheDocument()
  })
})

describe('DT-03 certificado', () => {
  it('janela com 2 a 6 gerações, marcada com as gerações da árvore', async () => {
    mockGet()
    montar()
    await screen.findByRole('heading', { level: 1 })
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Gerações' }), '5')
    await userEvent.click(screen.getByRole('button', { name: /Certificado PDF/ }))
    const dialogo = screen.getByRole('dialog', { name: 'Certificado de 4272402/24' })
    const radios = within(dialogo).getAllByRole('radio')
    expect(radios.map((r) => (r as HTMLInputElement).value)).toEqual(['2', '3', '4', '5', '6'])
    expect(within(dialogo).getByRole('radio', { name: /5/ })).toBeChecked()
    await userEvent.click(within(dialogo).getByRole('radio', { name: /^3/ }))
    expect(within(dialogo).getByRole('link', { name: /Baixar PDF \(3 gerações\)/ })).toHaveAttribute('href', '/api/pombos/10/certificado?geracoes=3')
  })
})

describe('DT-04 excluir e copiar com confirmação na janela', () => {
  it('excluir: recusa do servidor (RG-09) aparece dentro da janela', async () => {
    mockGet()
    const del = vi.spyOn(api, 'delete').mockRejectedValue(erroApi(409, 'Não é possível excluir: é pai de 555/24'))
    const confirmar = vi.spyOn(window, 'confirm')
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Mais ações' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Excluir pombo…' }))
    const janela = screen.getByRole('alertdialog', { name: 'Excluir 4272402/24?' })
    await userEvent.click(within(janela).getByRole('button', { name: 'Excluir pombo' }))
    expect(await within(janela).findByText(/é pai de 555\/24/)).toBeInTheDocument()
    expect(del).toHaveBeenCalledWith('/pombos/10')
    expect(confirmar).not.toHaveBeenCalled()
  })

  it('excluir com sucesso volta para a lista', async () => {
    mockGet()
    vi.spyOn(api, 'delete').mockResolvedValue({ data: null })
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Mais ações' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Excluir pombo…' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir pombo' }))
    expect(await screen.findByTestId('onde')).toHaveTextContent('/pombos')
  })

  it('copiar: conflitos (RC-03) aparecem dentro da janela', async () => {
    mockGet(pombo({ usuario_id: 2, dono: OUTRA }))
    vi.spyOn(api, 'post').mockRejectedValue(erroApi(409, 'Já existem no seu plantel: 300/22'))
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Copiar para meu plantel' }))
    const janela = screen.getByRole('alertdialog')
    await userEvent.click(within(janela).getByRole('button', { name: 'Copiar' }))
    expect(await within(janela).findByText(/300\/22/)).toBeInTheDocument()
  })
})

describe('DT-05 abas', () => {
  it('Pedigree · Resultados (n) · Observações, com setas do teclado', async () => {
    mockGet()
    montar()
    await screen.findByRole('heading', { level: 1 })
    const abas = screen.getAllByRole('tab')
    expect(abas.map((a) => a.textContent)).toEqual(['Pedigree', 'Resultados2', 'Observações'])
    expect(abas[0]).toHaveAttribute('aria-selected', 'true')
    abas[0].focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /Resultados/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Resultados/ })).toHaveFocus()
    await userEvent.keyboard('{End}')
    expect(screen.getByText('Bom de fundo')).toBeInTheDocument()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Pedigree' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('heading', { name: 'Irmãos' })).toBeInTheDocument()
  })
})

describe('DT-06 resultados', () => {
  it('do mais recente ao mais antigo; prova obrigatória; remover pede confirmação', async () => {
    mockGet()
    const post = vi.spyOn(api, 'post')
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: null })
    montar()
    await userEvent.click(await screen.findByRole('tab', { name: /Resultados/ }))
    const linhas = await screen.findAllByRole('row')
    expect(linhas.slice(1).map((l) => within(l).getAllByRole('cell')[1].textContent)).toEqual(['Prova Nova', 'Prova Antiga'])
    await userEvent.click(screen.getByRole('button', { name: '+ Resultado' }))
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
    expect(screen.getByRole('textbox', { name: /Prova/ })).toHaveAccessibleDescription(/obrigatória/)
    expect(post).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Remover Prova Antiga' }))
    expect(del).not.toHaveBeenCalled()
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remover' }))
    await waitFor(() => expect(del).toHaveBeenCalledWith('/pombos/10/resultados/1'))
  })

  it('o número na aba acompanha a inclusão de um resultado', async () => {
    let lista: Resultado[] = RESULTADOS
    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      if (url === '/pombos/10/resultados') return { data: lista }
      if (url === '/pombos/10') return { data: pombo() }
      if (url === '/pombos/10/arvore') return { data: ARVORE }
      return { data: { completos: [], meios_paternos: [], meios_maternos: [] } }
    })
    vi.spyOn(api, 'post').mockImplementation(async () => {
      lista = [...RESULTADOS, { id: 3, pombo_id: 10, ano: 2026, competicao: 'Prova Três', distancia_km: null, colocacao: null, premio: null, observacao: null }]
      return { data: lista[2] }
    })
    montar()
    await userEvent.click(await screen.findByRole('tab', { name: /Resultados/ }))
    await userEvent.click(await screen.findByRole('button', { name: '+ Resultado' }))
    await userEvent.type(screen.getByRole('textbox', { name: /Prova/ }), 'Prova Três')
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
    await waitFor(() => expect(screen.getByRole('tab', { name: /Resultados/ })).toHaveTextContent('Resultados3'))
  })

  it('só leitura não tem incluir nem remover', async () => {
    mockGet(pombo({ usuario_id: 2, dono: OUTRA }))
    montar()
    await userEvent.click(await screen.findByRole('tab', { name: /Resultados/ }))
    await screen.findByText('Prova Nova')
    expect(screen.queryByRole('button', { name: '+ Resultado' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Remover/ })).toBeNull()
  })
})

describe('AR árvore', () => {
  it('AR-01 / AR-04 / AR-06: rótulos, repetido, sexo não confere e link para o ancestral', async () => {
    mockGet()
    montar()
    await waitFor(() => expect(colunas()).not.toBeNull())
    const c = within(colunas())
    expect(c.getByLabelText(/^Pombo principal: 4272402\/24/)).toBeInTheDocument()
    expect(c.getByRole('link', { name: /^Pai: 300\/22/ })).toHaveAttribute('href', '/pombos/11')
    expect(c.getByRole('link', { name: /^Avô paterno: 500\/19, Macho, repetido na árvore/ })).toBeInTheDocument()
    expect(c.getByText('⚠ repetido')).toBeInTheDocument()
    expect(c.getByRole('link', { name: /^Avó paterna: 600\/19.*sexo não confere/ })).toBeInTheDocument()
  })

  it('AR-01: trocar as gerações mantém a árvore atual até a nova chegar, sem vagas falsas', async () => {
    let soltar = () => {}
    const espera = new Promise<void>((r) => (soltar = r))
    mockGet()
    const get = vi.mocked(api.get)
    const original = get.getMockImplementation()!
    get.mockImplementation(async (url: string, cfg?: unknown) => {
      if (url === '/pombos/10/arvore' && (cfg as { params: { geracoes: number } }).params.geracoes === 6) await espera
      return original(url, cfg as never)
    })
    montar()
    await waitFor(() => expect(colunas()).not.toBeNull())
    expect(colunas().children).toHaveLength(5) // principal + 4 gerações
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Gerações' }), '6')
    expect(screen.queryByText('Carregando a árvore…')).toBeNull()
    expect(colunas().children).toHaveLength(5) // ainda a árvore de 4, desenhada com 4
    soltar()
    await waitFor(() => expect(colunas().children).toHaveLength(7))
  })

  it('AR-03: vagas "+ Pai/+ Mãe" só para quem edita; "Desconhecido" para quem só lê', async () => {
    mockGet()
    const { unmount } = montar()
    await waitFor(() => expect(colunas()).not.toBeNull())
    expect(within(colunas()).getByRole('button', { name: 'Adicionar mãe de 4272402/24' })).toBeInTheDocument()
    expect(within(colunas()).queryByText('Desconhecido')).toBeNull()
    unmount()
    mockGet(pombo({ usuario_id: 2, dono: OUTRA }))
    montar()
    await waitFor(() => expect(colunas()).not.toBeNull())
    expect(within(colunas()).queryByRole('button', { name: /Adicionar/ })).toBeNull()
    expect(within(colunas()).getAllByText('Desconhecido').length).toBeGreaterThan(0)
  })

  it('AR-02: no celular, tocar no pai sobe uma geração e a trilha volta', async () => {
    mockGet()
    montar()
    await waitFor(() => expect(celular()).not.toBeNull())
    const m = within(celular())
    await userEvent.click(m.getByRole('button', { name: 'Subir para Pai: 300/22' }))
    expect(m.getByRole('button', { name: 'Subir para Avô paterno: 500/19' })).toBeInTheDocument()
    await userEvent.click(m.getByRole('button', { name: 'Principal' }))
    expect(m.getByRole('button', { name: 'Subir para Pai: 300/22' })).toBeInTheDocument()
  })

  it('AR-05: vaga abre o painel, só fêmeas/desconhecidos, e liga sem sair da página', async () => {
    mockGet()
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: pombo({ mae_id: 20 }) })
    montar()
    await waitFor(() => expect(colunas()).not.toBeNull())
    await userEvent.click(within(colunas()).getByRole('button', { name: 'Adicionar mãe de 4272402/24' }))
    const painel = await screen.findByRole('dialog', { name: /Adicionar mãe ♀ de 4272402\/24/ })
    expect(await within(painel).findByRole('button', { name: 'Escolher 777/20 como mãe' })).toBeInTheDocument()
    expect(within(painel).queryByText('888/20')).toBeNull() // macho fora
    await userEvent.click(within(painel).getByRole('button', { name: 'Escolher 777/20 como mãe' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/pombos/10/genitor', { papel: 'mae', genitor_id: 20 }))
    expect(await screen.findByText('777/20 ligado como mãe de 4272402/24')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: '4272402/24' })).toBeInTheDocument()
  })

  it('AR-05: erro do servidor aparece dentro do painel', async () => {
    mockGet()
    vi.spyOn(api, 'post').mockRejectedValue(erroApi(400, 'Ciclo na genealogia: 4272402/24 seria ancestral de si mesmo'))
    montar()
    await waitFor(() => expect(colunas()).not.toBeNull())
    await userEvent.click(within(colunas()).getByRole('button', { name: 'Adicionar mãe de 4272402/24' }))
    const painel = await screen.findByRole('dialog')
    await userEvent.click(await within(painel).findByRole('button', { name: 'Escolher 777/20 como mãe' }))
    expect(await within(painel).findByText(/Ciclo na genealogia/)).toBeInTheDocument()
  })
})
