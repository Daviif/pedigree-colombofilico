import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { classeBotao, type VarianteBotao } from './classes'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBotao
  pequeno?: boolean
  /** Mostra o texto de carregamento, desabilita e marca aria-busy. */
  carregando?: boolean
  textoCarregando?: string
  icone?: ReactNode
}

export function Botao({
  variante = 'secundaria',
  pequeno = false,
  carregando = false,
  textoCarregando = 'Salvando…',
  icone,
  className = '',
  type = 'button',
  disabled,
  children,
  ...resto
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={`${classeBotao(variante, pequeno)} ${className}`}
      {...resto}
    >
      {carregando ? (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        icone
      )}
      {carregando ? textoCarregando : children}
    </button>
  )
}
