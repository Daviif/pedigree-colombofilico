import { type ReactNode, type RefObject, useId } from 'react'
import { createPortal } from 'react-dom'

import { useModal } from './useModal'

type Props = {
  aberto: boolean
  aoFechar: () => void
  titulo: string
  subtitulo?: ReactNode
  children: ReactNode
  focoInicial?: RefObject<HTMLElement | null>
}

/** Painel à direita (desktop, 430 px) ou de baixo para cima (celular, 86% da altura). */
export function PainelLateral({ aberto, aoFechar, titulo, subtitulo, children, focoInicial }: Props) {
  const ref = useModal(aberto, aoFechar, focoInicial)
  const idTitulo = useId()
  if (!aberto) return null
  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#0b1730]/50" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 flex h-[86vh] flex-col overflow-hidden rounded-t-[18px] bg-white shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:h-auto sm:w-[430px] sm:rounded-none"
      >
        <div className="flex items-start justify-between gap-3 bg-marinho px-5 py-4 text-white">
          <div>
            <h2 id={idTitulo} className="text-[17px] font-semibold">
              {titulo}
            </h2>
            {subtitulo && <div className="text-[13px] text-[#b8c4da]">{subtitulo}</div>}
          </div>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="grid h-11 w-11 place-items-center rounded-lg text-white hover:bg-white/10">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
