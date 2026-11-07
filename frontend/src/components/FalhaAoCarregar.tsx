import { isAxiosError } from 'axios'

/** RF-02: o que mostrar quando uma consulta falha, em vez de "Carregando..." para sempre. */
export function FalhaAoCarregar({
  erro,
  oQue,
  onTentar,
}: {
  erro: unknown
  oQue: string
  onTentar: () => void
}) {
  const semConexao = isAxiosError(erro) && !erro.response
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <p className="font-medium">Não foi possível carregar {oQue}.</p>
      <p className="mt-0.5 text-red-700">
        {semConexao
          ? 'Sem conexão com o servidor. Confira a internet.'
          : 'O servidor teve um problema. Se continuar, avise o suporte.'}
      </p>
      <button
        type="button"
        onClick={onTentar}
        className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-100"
      >
        Tentar de novo
      </button>
    </div>
  )
}
