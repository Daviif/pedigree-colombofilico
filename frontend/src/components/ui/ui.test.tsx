import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Aviso, Botao, Campo, Carregando, Dialogo, DialogoConfirmacao, PainelLateral, ProvedorNotificacao, SeloSituacao, SexoRotulo, Vazio, classeEntrada, useNotificar } from '.'

describe('Botao', () => {
  it('carregando desabilita, marca aria-busy e troca o texto', () => {
    render(<Botao carregando>Salvar</Botao>)
    const b = screen.getByRole('button')
    expect(b).toBeDisabled()
    expect(b).toHaveAttribute('aria-busy', 'true')
    expect(b).toHaveTextContent('Salvando…')
  })

  it('é type=button por padrão (não envia formulário sem querer)', () => {
    render(<Botao>Ok</Botao>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })
})

describe('Campo', () => {
  it('liga rótulo, dica e erro ao controle (RV-07: erro embaixo do campo)', () => {
    render(
      <Campo rotulo="Anilha" obrigatorio dica="Só números e /" erro="Anilha: obrigatório">
        {(c) => <input className={classeEntrada(true)} {...c} />}
      </Campo>,
    )
    const entrada = screen.getByLabelText(/Anilha/)
    expect(entrada).toHaveAttribute('aria-invalid', 'true')
    expect(entrada).toHaveAttribute('aria-required', 'true')
    expect(entrada).toHaveAccessibleDescription('Anilha: obrigatório Só números e /')
    expect(screen.getByRole('alert')).toHaveTextContent('Anilha: obrigatório')
  })

  it('sem erro não marca inválido nem mostra alerta', () => {
    render(<Campo rotulo="Cor">{(c) => <input {...c} />}</Campo>)
    expect(screen.getByLabelText('Cor')).not.toHaveAttribute('aria-invalid')
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('Selos (UX-05)', () => {
  it('situação aparece legível, nunca o código cru', () => {
    render(<SeloSituacao situacao="REPRODUTOR" />)
    expect(screen.getByText('Reprodutor')).toBeInTheDocument()
    expect(screen.queryByText('REPRODUTOR')).toBeNull()
  })

  it('sexo: símbolo decorativo, o texto é que informa', () => {
    const { container } = render(<SexoRotulo sexo="F" />)
    expect(container).toHaveTextContent('♀Fêmea')
    expect(container.querySelector('b')).toHaveAttribute('aria-hidden', 'true')
  })

  it('sexo só com símbolo ainda tem nome para o leitor de tela', () => {
    render(<SexoRotulo sexo="M" soSimbolo />)
    expect(screen.getByText('Macho')).toHaveClass('sr-only')
  })
})

function ComJanela({ painel = false }: { painel?: boolean }) {
  const [aberto, setAberto] = useState(false)
  const foco = useRef<HTMLInputElement>(null)
  const Janela = painel ? PainelLateral : Dialogo
  return (
    <>
      <button onClick={() => setAberto(true)}>Abrir</button>
      <input aria-label="fora" />
      <Janela aberto={aberto} aoFechar={() => setAberto(false)} titulo="Adicionar mãe" focoInicial={foco}>
        <input aria-label="anilha" ref={foco} />
        <input aria-label="cor" />
        <button>Salvar</button>
      </Janela>
    </>
  )
}

describe.each([
  ['Dialogo', false],
  ['PainelLateral', true],
])('%s (useModal)', (_nome, painel) => {
  it('foco IMEDIATO no campo inicial, sem esperar timer', async () => {
    render(<ComJanela painel={painel} />)
    await userEvent.click(screen.getByText('Abrir'))
    // sem waitFor: o foco precisa estar lá no mesmo ciclo (lição do protótipo)
    expect(screen.getByLabelText('anilha')).toHaveFocus()
    expect(screen.getByRole('dialog', { name: 'Adicionar mãe' })).toHaveAttribute('aria-modal', 'true')
  })

  it('digitação rápida logo depois de abrir vai para o campo certo', async () => {
    render(<ComJanela painel={painel} />)
    await userEvent.click(screen.getByText('Abrir'))
    await userEvent.type(screen.getByLabelText('anilha'), '123')
    await userEvent.type(screen.getByLabelText('cor'), 'Azul')
    expect(screen.getByLabelText('anilha')).toHaveValue('123')
    expect(screen.getByLabelText('cor')).toHaveValue('Azul')
  })

  it('Tab fica preso dentro da janela', async () => {
    render(<ComJanela painel={painel} />)
    await userEvent.click(screen.getByText('Abrir'))
    const dentro = screen.getByRole('dialog')
    for (let i = 0; i < 6; i++) {
      await userEvent.tab()
      expect(dentro.contains(document.activeElement)).toBe(true)
    }
    await userEvent.tab({ shift: true })
    expect(dentro.contains(document.activeElement)).toBe(true)
  })

  it('Esc fecha e o foco volta para quem abriu', async () => {
    render(<ComJanela painel={painel} />)
    const abrir = screen.getByText('Abrir')
    await userEvent.click(abrir)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(abrir).toHaveFocus()
  })
})

describe('useModal com autoFocus', () => {
  function ComAutoFocus() {
    const [aberto, setAberto] = useState(false)
    return (
      <>
        <button onClick={() => setAberto(true)}>Abrir</button>
        <PainelLateral aberto={aberto} aoFechar={() => setAberto(false)} titulo="Painel">
          <input aria-label="busca" autoFocus />
        </PainelLateral>
      </>
    )
  }

  it('respeita o autoFocus de um campo de dentro (não joga o foco no ✕)', async () => {
    render(<ComAutoFocus />)
    const abrir = screen.getByText('Abrir')
    await userEvent.click(abrir)
    expect(screen.getByLabelText('busca')).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(abrir).toHaveFocus()
  })
})

describe('DialogoConfirmacao', () => {
  it('é alertdialog, começa no Cancelar e a ação perigosa confirma', async () => {
    const confirmar = vi.fn()
    const fechar = vi.fn()
    render(
      <DialogoConfirmacao aberto aoFechar={fechar} aoConfirmar={confirmar} titulo="Excluir 4272402/24?" textoConfirmar="Excluir pombo" perigo>
        Não dá para desfazer.
      </DialogoConfirmacao>,
    )
    expect(screen.getByRole('alertdialog', { name: 'Excluir 4272402/24?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    await userEvent.click(screen.getByRole('button', { name: 'Excluir pombo' }))
    expect(confirmar).toHaveBeenCalledOnce()
    expect(fechar).not.toHaveBeenCalled()
  })
})

describe('Aviso, Vazio, Carregando', () => {
  it('erro é role=alert; os demais, role=status', () => {
    render(<><Aviso tom="erro">falhou</Aviso><Aviso tom="sucesso">ok</Aviso></>)
    expect(screen.getByRole('alert')).toHaveTextContent('falhou')
    expect(screen.getByRole('status')).toHaveTextContent('ok')
  })

  it('vazio diz o que aconteceu e oferece a ação', () => {
    render(<Vazio titulo="Nenhum pombo cadastrado ainda" acao={<Botao>+ Cadastrar o primeiro</Botao>} />)
    expect(screen.getByText('Nenhum pombo cadastrado ainda')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Cadastrar o primeiro' })).toBeInTheDocument()
  })

  it('carregando é anunciado ao leitor de tela', () => {
    render(<Carregando rotulo="Carregando os pombos…" />)
    expect(screen.getByRole('status')).toHaveTextContent('Carregando os pombos…')
  })
})

describe('Notificação', () => {
  afterEach(() => vi.useRealTimers())

  function Gatilho() {
    const notificar = useNotificar()
    return <button onClick={() => notificar('4272402/24 salvo')}>Salvar</button>
  }

  it('aparece e some sozinha', () => {
    vi.useFakeTimers()
    render(<ProvedorNotificacao duracao={1000}><Gatilho /></ProvedorNotificacao>)
    act(() => screen.getByText('Salvar').click())
    expect(screen.getByRole('status')).toHaveTextContent('4272402/24 salvo')
    act(() => vi.advanceTimersByTime(1100))
    expect(screen.getByRole('status')).toHaveTextContent('')
  })
})
