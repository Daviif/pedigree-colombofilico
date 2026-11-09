/** Regras CA-01..07 (README, "Cadastro e edição de pombo"). */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, type AxiosResponse } from 'axios'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '../../api/client'
import type { Pombo } from '../../api/types'
import { ProvedorNotificacao } from '../../components/ui'
import { PomboForm } from './PomboForm'

const dono = { id: 1, nome: 'Davi Fonseca' }
function pombo(id: number, anilha: string, extra: Partial<Pombo> = {}) {
  return { id, anilha, sexo: 'M', cor: 'Escama', status: 'ATIVO', usuario_id: 1, dono, pai: null, mae: null, pai_id: null, mae_id: null, proprietario: null, observacoes: null, origem: null, resultados: [], ...extra } as unknown as Pombo
}
const PAI = pombo(1, '10/20')
const MAE = pombo(2, '20/20', { sexo: 'F', cor: 'Azul' })
const OUTRO = pombo(3, '30/20', { cor: 'Escama' })

function erroApi(status: number, detail: unknown) {
  const e = new AxiosError('falhou')
  e.response = { status, data: { detail } } as AxiosResponse
  return e
}

function mockGet(detalhe?: Pombo, atraso?: Promise<void>) {
  return vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url === '/pombos') return { data: [PAI, MAE, OUTRO] }
    if (url === '/proprietarios') return { data: [{ id: 5, nome: 'Anízio' }] }
    if (url.startsWith('/pombos/')) {
      if (atraso) await atraso
      return { data: detalhe }
    }
    throw new Error(url)
  })
}

function Onde() {
  const l = useLocation()
  return <output data-testid="onde">{l.pathname}</output>
}

function montar(rota = '/pombos/novo') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(['usuario-atual'], { id: 1, login: 'davi', nome: 'Davi Fonseca', admin: false })
  return render(
    <QueryClientProvider client={qc}>
      <ProvedorNotificacao>
        <MemoryRouter initialEntries={['/pombos', rota]} initialIndex={1}>
          <Routes>
            <Route path="/pombos/novo" element={<PomboForm />} />
            <Route path="/pombos/:id/editar" element={<PomboForm />} />
            <Route path="*" element={<Onde />} />
          </Routes>
        </MemoryRouter>
      </ProvedorNotificacao>
    </QueryClientProvider>,
  )
}

const anilha = () => screen.getByRole('textbox', { name: /Anilha/ })

afterEach(() => vi.restoreAllMocks())

describe('CA-01 formulário e sexo', () => {
  it('sexo em três botões, com teclado', async () => {
    mockGet()
    montar()
    const grupo = screen.getByRole('group', { name: 'Sexo' })
    const opcoes = within(grupo).getAllByRole('radio')
    expect(opcoes.map((r) => r.closest('label')!.textContent)).toEqual(['♂Macho', '♀Fêmea', 'Não sei'])
    expect(within(grupo).getByRole('radio', { name: 'Não sei' })).toBeChecked()
    await userEvent.click(within(grupo).getByRole('radio', { name: /Macho/ }))
    await userEvent.keyboard('{ArrowRight}')
    expect(within(grupo).getByRole('radio', { name: /Fêmea/ })).toBeChecked()
  })
})

describe('CA-02 erros embaixo do campo', () => {
  it('anilha vazia: erro no campo, sem ir ao servidor', async () => {
    mockGet()
    const post = vi.spyOn(api, 'post')
    montar()
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(anilha()).toHaveAccessibleDescription(/Anilha: obrigatória/)
    expect(anilha()).toHaveFocus()
    expect(post).not.toHaveBeenCalled()
  })

  it('anilha repetida (servidor) aparece na anilha e nada do que foi digitado se perde', async () => {
    mockGet()
    vi.spyOn(api, 'post').mockRejectedValue(erroApi(400, 'Já existe um pombo com essa anilha'))
    montar()
    await userEvent.type(anilha(), '10/20')
    await userEvent.type(screen.getByRole('combobox', { name: 'Cor' }), 'Azul')
    await userEvent.type(screen.getByRole('textbox', { name: 'Observações' }), 'Filho do campeão')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(anilha()).toHaveAttribute('aria-invalid', 'true'))
    expect(anilha()).toHaveAccessibleDescription(/Já existe um pombo com essa anilha/)
    expect(anilha()).toHaveValue('10/20')
    expect(screen.getByRole('textbox', { name: 'Observações' })).toHaveValue('Filho do campeão')
    expect(screen.queryByText(/Já existe/, { selector: '[role=status] *' })).toBeNull()
  })

  it('erro de pai vai para o campo Pai; ciclo vai para o topo', async () => {
    mockGet()
    const post = vi.spyOn(api, 'post').mockRejectedValueOnce(erroApi(400, 'O pai precisa ser macho ou de sexo desconhecido'))
    montar()
    await userEvent.type(anilha(), '99/26')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByRole('combobox', { name: /Pai/ })).toHaveAccessibleDescription(/O pai precisa ser macho/)
    post.mockRejectedValueOnce(erroApi(400, 'Esse vínculo faria do pombo 99/26 ancestral de si mesmo'))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText(/ancestral de si mesmo/)).toBeInTheDocument()
  })
})

describe('Seletor de pai/mãe (sistema visual §6)', () => {
  it('é combobox: ↓ escolhe, Enter confirma sem enviar o formulário', async () => {
    mockGet()
    const post = vi.spyOn(api, 'post')
    montar()
    const pai = screen.getByRole('combobox', { name: /Pai/ })
    await userEvent.click(pai)
    expect(pai).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(pai).toHaveValue('30/20 — Escama')  // só machos/desconhecidos: 10/20 e 30/20
    expect(post).not.toHaveBeenCalled()
  })

  it('o de mãe só oferece fêmeas ou desconhecidos', async () => {
    mockGet()
    montar()
    await userEvent.click(screen.getByRole('combobox', { name: /Mãe/ }))
    const nomes = screen.getAllByRole('option').map((o) => o.textContent)
    expect(nomes).toContain('20/20 — Azul')
    expect(nomes.some((n) => n?.startsWith('10/20'))).toBe(false)
  })
})

describe('CA-03 cores', () => {
  it('atalhos com as cores mais usadas preenchem o campo', async () => {
    mockGet()
    montar()
    const atalhos = await screen.findByRole('group', { name: 'Cores mais usadas no seu plantel' }).catch(() => screen.findByLabelText('Cores mais usadas no seu plantel'))
    const botoes = within(atalhos).getAllByRole('button')
    expect(botoes.map((b) => b.textContent)).toEqual(['Escama', 'Azul'])
    await userEvent.click(botoes[1])
    expect(screen.getByRole('combobox', { name: 'Cor' })).toHaveValue('Azul')
  })
})

describe('CA-04 salvar e cadastrar outro', () => {
  it('mantém pai, mãe, proprietário, cor e situação; limpa anilha, sexo, origem e observações', async () => {
    mockGet()
    const post = vi.spyOn(api, 'post').mockImplementation(async (_u, dados) => ({ data: { ...(dados as object), id: 50 } }))
    montar()
    await userEvent.type(anilha(), '100/26')
    await userEvent.click(screen.getByRole('radio', { name: /Fêmea/ }))
    await userEvent.type(screen.getByRole('combobox', { name: 'Cor' }), 'Azul')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Situação' }), 'REPRODUTOR')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Proprietário' }), '5')
    await userEvent.type(screen.getByRole('textbox', { name: 'Observações' }), 'obs')
    const campoPai = screen.getByRole('combobox', { name: /Pai/ })
    await userEvent.click(campoPai)
    await userEvent.click(await screen.findByRole('option', { name: /10\/20/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar e cadastrar outro' }))

    expect(await screen.findByText('100/26 salvo — cadastre o próximo')).toBeInTheDocument()
    expect(post).toHaveBeenCalledOnce()
    expect(anilha()).toHaveValue('')
    expect(anilha()).toHaveFocus()
    expect(screen.getByRole('radio', { name: 'Não sei' })).toBeChecked()
    expect(screen.getByRole('textbox', { name: 'Observações' })).toHaveValue('')
    expect(screen.getByRole('combobox', { name: 'Cor' })).toHaveValue('Azul')
    expect(screen.getByRole('combobox', { name: 'Situação' })).toHaveValue('REPRODUTOR')
    expect(screen.getByRole('combobox', { name: 'Proprietário' })).toHaveValue('5')
    expect(screen.getByRole('combobox', { name: /Pai/ })).toHaveValue('10/20 — Escama')
    expect(screen.queryByTestId('onde')).toBeNull() // continua no formulário
  })

  it('não aparece na edição', async () => {
    mockGet(pombo(9, '9/26'))
    montar('/pombos/9/editar')
    await screen.findByRole('heading', { name: 'Editar 9/26' })
    expect(screen.queryByRole('button', { name: 'Salvar e cadastrar outro' })).toBeNull()
  })
})

describe('CA-05 salvar', () => {
  it('vai para o pombo com aviso; enquanto salva mostra "Salvando…" e não envia duas vezes', async () => {
    mockGet()
    let liberar!: (v: unknown) => void
    const post = vi.spyOn(api, 'post').mockImplementation(() => new Promise((r) => (liberar = r)))
    montar()
    await userEvent.type(anilha(), '77/26')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    const botao = await screen.findByRole('button', { name: 'Salvando…' })
    expect(botao).toBeDisabled()
    await userEvent.click(botao)
    expect(post).toHaveBeenCalledOnce()
    await act(async () => liberar({ data: { id: 77, anilha: '77/26' } }))
    expect(await screen.findByTestId('onde')).toHaveTextContent('/pombos/77')
    expect(screen.getByText('77/26 salvo')).toBeInTheDocument()
  })
})

describe('CA-06 edição só com os dados', () => {
  it('mostra carregando, sem formulário vazio, até os dados chegarem', async () => {
    let chegou!: () => void
    mockGet(pombo(9, '9/26', { cor: 'Pigarça', sexo: 'F' }), new Promise<void>((r) => (chegou = r)))
    montar('/pombos/9/editar')
    expect(screen.getByText('Carregando o pombo…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull()
    await act(async () => chegou())
    expect(await screen.findByRole('textbox', { name: /Anilha/ })).toHaveValue('9/26')
    expect(screen.getByRole('combobox', { name: 'Cor' })).toHaveValue('Pigarça')
    expect(screen.getByRole('radio', { name: /Fêmea/ })).toBeChecked()
  })
})

describe('CA-07 cancelar', () => {
  it('volta para a página anterior sem salvar', async () => {
    mockGet()
    const post = vi.spyOn(api, 'post')
    montar()
    await userEvent.type(anilha(), '5/26')
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByTestId('onde')).toHaveTextContent('/pombos')
    expect(post).not.toHaveBeenCalled()
  })
})
