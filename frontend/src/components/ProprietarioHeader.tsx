import type { Proprietario } from '../api/types'

export function ProprietarioHeader({ proprietario }: { proprietario: Proprietario }) {
  const contato = [proprietario.endereco, proprietario.telefone, proprietario.email]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="rounded-lg border-b-4 border-blue-700 bg-white p-4 shadow-sm">
      <div className="text-base font-bold uppercase text-slate-800">
        {proprietario.colombodromo && `Pombal ${proprietario.colombodromo} — `}
        Propriedade de {proprietario.nome}
      </div>
      {proprietario.observacoes && (
        <div className="mt-1 whitespace-pre-line text-sm text-slate-700">{proprietario.observacoes}</div>
      )}
      {contato && <div className="mt-1 text-xs text-slate-500">{contato}</div>}
    </div>
  )
}
