import { Fragment } from 'react'
import { Link } from 'react-router-dom'

export type Migalha = { rotulo: string; para?: string }

/** Caminho no topo da página (NV-06). O último item é a página atual e não é link. */
export function Migalhas({ itens }: { itens: Migalha[] }) {
  return (
    <nav aria-label="Caminho" className="mb-3 flex flex-wrap items-center gap-1.5 text-[13px] text-slate-500">
      {itens.map((m, i) => {
        const ultimo = i === itens.length - 1
        return (
          <Fragment key={`${m.rotulo}-${i}`}>
            {i > 0 && <span aria-hidden>›</span>}
            {ultimo || !m.para ? (
              <span aria-current={ultimo ? 'page' : undefined} className={ultimo ? 'font-semibold text-slate-900' : ''}>
                {m.rotulo}
              </span>
            ) : (
              <Link to={m.para} className="inline-flex min-h-11 items-center text-slate-600 hover:text-link hover:underline sm:min-h-0">
                {m.rotulo}
              </Link>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
