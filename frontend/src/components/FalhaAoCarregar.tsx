import { isAxiosError } from 'axios'

import { Aviso, Botao } from './ui'

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
    <Aviso tom="erro" titulo={`Não foi possível carregar ${oQue}.`}>
      <p className="mt-0.5">
        {semConexao
          ? 'Sem conexão com o servidor. Confira a internet.'
          : 'O servidor teve um problema. Se continuar, avise o suporte.'}
      </p>
      <Botao pequeno className="mt-2" onClick={onTentar}>
        Tentar de novo
      </Botao>
    </Aviso>
  )
}
