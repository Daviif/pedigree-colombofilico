/** Regras LG-02..06 (README, "Tela de login"). */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, type AxiosResponse } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '../api/client'
import { Login } from './Login'

function erroApi(status: number, detail: string) {
  const e = new AxiosError('falhou')
  e.response = { status, data: { detail } } as AxiosResponse
  return e
}
function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <Login />
    </QueryClientProvider>,
  )
  return qc
}
const usuario = () => screen.getByRole('textbox', { name: 'Usuário' })
const senha = () => screen.getByLabelText('Senha')

afterEach(() => vi.restoreAllMocks())

describe('LG login', () => {
  it('LG-02: rótulos, preenchimento automático e mostrar/ocultar a senha', async () => {
    montar()
    expect(usuario()).toHaveFocus()
    expect(usuario()).toHaveAttribute('autocomplete', 'username')
    expect(usuario()).toHaveAttribute('autocapitalize', 'none')
    expect(senha()).toHaveAttribute('autocomplete', 'current-password')
    expect(senha()).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(senha()).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toBeInTheDocument()
  })

  it('LG-03: vazio dá erro no campo e não chama o servidor', async () => {
    const post = vi.spyOn(api, 'post')
    montar()
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(usuario()).toHaveAccessibleDescription(/Usuário: obrigatório/)
    expect(senha()).toHaveAccessibleDescription(/Senha: obrigatória/)
    expect(usuario()).toHaveFocus()
    await userEvent.type(usuario(), 'davi{Enter}')
    expect(senha()).toHaveFocus()
    expect(post).not.toHaveBeenCalled()
  })

  it.each([
    [erroApi(401, 'Usuário ou senha incorretos.'), 'Usuário ou senha incorretos.'],
    [erroApi(429, 'Muitas tentativas de login. Tente de novo em 12 minutos.'), 'Tente de novo em 12 minutos'],
    [new AxiosError('Network Error', 'ERR_NETWORK'), 'Sem conexão com o servidor. Confira a internet.'],
  ])('LG-04: recusa no topo; usuário fica, senha sai, cursor na senha (%#)', async (erro, texto) => {
    const post = vi.spyOn(api, 'post').mockRejectedValue(erro)
    montar()
    await userEvent.type(usuario(), ' Davi ')
    await userEvent.type(senha(), 'errada{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent(texto)
    expect(post).toHaveBeenCalledWith('/auth/login', { login: 'Davi', senha: 'errada' })
    expect(usuario()).toHaveValue(' Davi ')
    expect(senha()).toHaveValue('')
    expect(senha()).toHaveFocus()
  })

  it('LG-05: "Entrando…" e não envia duas vezes; sucesso guarda o usuário', async () => {
    let soltar: (v: unknown) => void = () => {}
    const post = vi.spyOn(api, 'post').mockReturnValue(new Promise((r) => (soltar = r)))
    const qc = montar()
    await userEvent.type(usuario(), 'davi')
    await userEvent.type(senha(), 'certa')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(screen.getByRole('button', { name: /Entrando…/ })).toBeDisabled()
    await userEvent.type(senha(), '{Enter}')
    expect(post).toHaveBeenCalledTimes(1)
    soltar({ data: { id: 1, login: 'davi', nome: 'Davi Fonseca', admin: false } })
    await waitFor(() => expect(qc.getQueryData(['usuario-atual'])).toMatchObject({ login: 'davi' }))
  })

  it('LG-06: orienta a pedir a senha ao administrador; LG-01: crédito da foto', () => {
    montar()
    expect(screen.getByText('Esqueceu a senha? Peça ao administrador do sistema.')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'CC BY-SA 2.0' }).length).toBeGreaterThan(0)
  })
})
