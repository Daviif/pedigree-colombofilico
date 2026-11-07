import { type ReactNode, useId } from 'react'

/** Props de acessibilidade que o Campo entrega para o controle de dentro. */
export type PropsControle = {
  id: string
  'aria-invalid'?: true
  'aria-describedby'?: string
  'aria-required'?: true
}

type Props = {
  rotulo: string
  obrigatorio?: boolean
  dica?: ReactNode
  /** Mensagem de erro do campo (aparece embaixo, em vermelho; RV-07). */
  erro?: string | null
  className?: string
  children: (controle: PropsControle) => ReactNode
}

/** Rótulo sempre visível + controle + dica + erro embaixo do campo. */
export function Campo({ rotulo, obrigatorio, dica, erro, className = '', children }: Props) {
  const id = useId()
  const idDica = `${id}-dica`
  const idErro = `${id}-erro`
  const descricao = [erro ? idErro : null, dica ? idDica : null].filter(Boolean).join(' ')
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[13px] font-semibold text-slate-700">
        {rotulo}
        {obrigatorio && (
          <span className="text-red-700" aria-hidden>
            {' '}
            *
          </span>
        )}
      </label>
      {children({
        id,
        'aria-invalid': erro ? true : undefined,
        'aria-describedby': descricao || undefined,
        'aria-required': obrigatorio ? true : undefined,
      })}
      {dica && (
        <span id={idDica} className="text-xs text-slate-500">
          {dica}
        </span>
      )}
      {erro && (
        <span id={idErro} role="alert" className="flex gap-1 text-[12.5px] text-red-700">
          <span aria-hidden>⚠</span>
          {erro}
        </span>
      )}
    </div>
  )
}
