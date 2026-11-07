import { type ReactNode, type RefObject, useId } from 'react'
import { createPortal } from 'react-dom'

import { Botao } from './Botao'
import { useModal } from './useModal'

type Props = {
  aberto: boolean
  aoFechar: () => void
  titulo: string
  children: ReactNode
  /** Botões do rodapé; o último costuma ser a ação principal. */
  acoes?: ReactNode
  largo?: boolean
  focoInicial?: RefObject<HTMLElement | null>
  /** alertdialog para confirmações (o leitor de tela anuncia como alerta). */
  alerta?: boolean
}

/** Janela modal no lugar de confirm()/alert() (UX-09). Esc fecha; foco preso e devolvido. */
export function Dialogo({ aberto, aoFechar, titulo, children, acoes, largo, focoInicial, alerta }: Props) {
  const ref = useModal(aberto, aoFechar, focoInicial)
  const idTitulo = useId()
  if (!aberto) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#0b1730]/50 px-3 pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div
        ref={ref}
        role={alerta ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className={`max-h-[80vh] w-full overflow-auto rounded-[14px] bg-white p-6 shadow-2xl ${largo ? 'max-w-[640px]' : 'max-w-[480px]'}`}
      >
        <h2 id={idTitulo} className="text-[17px] font-semibold text-marinho">
          {titulo}
        </h2>
        <div className="mt-2 text-slate-600">{children}</div>
        {acoes && <div className="mt-5 flex flex-wrap justify-end gap-2">{acoes}</div>}
      </div>
    </div>,
    document.body,
  )
}

type Confirmacao = {
  aberto: boolean
  aoFechar: () => void
  aoConfirmar: () => void
  titulo: string
  children: ReactNode
  textoConfirmar: string
  perigo?: boolean
  carregando?: boolean
}

/** Confirmação com "Cancelar" e a ação; ação perigosa em vermelho. O foco começa no Cancelar. */
export function DialogoConfirmacao({ aberto, aoFechar, aoConfirmar, titulo, children, textoConfirmar, perigo, carregando }: Confirmacao) {
  return (
    <Dialogo
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={titulo}
      alerta
      acoes={
        <>
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao variante={perigo ? 'perigo' : 'primaria'} onClick={aoConfirmar} carregando={carregando} textoCarregando="Aguarde…">
            {textoConfirmar}
          </Botao>
        </>
      }
    >
      {children}
    </Dialogo>
  )
}
