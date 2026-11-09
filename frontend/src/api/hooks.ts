import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

import { api } from './client'
import type {
  ArvoreNo,
  Compartilhamentos,
  IrmaosResponse,
  Pombo,
  PomboDetail,
  PomboInput,
  PombosFiltro,
  Proprietario,
  ProprietarioInput,
  Resultado,
  ResultadoRecente,
  ResultadoInput,
  Usuario,
  UsuarioAdmin,
  UsuarioNovo,
} from './types'

// ---------- Autenticação ----------

export function useUsuarioAtual() {
  return useQuery({
    queryKey: ['usuario-atual'],
    queryFn: async () => {
      try {
        return (await api.get<Usuario>('/auth/me')).data
      } catch (erro) {
        if (isAxiosError(erro) && erro.response?.status === 401) return null
        throw erro
      }
    },
    staleTime: Infinity,
  })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dados: { login: string; senha: string }) =>
      (await api.post<Usuario>('/auth/login', dados)).data,
    onSuccess: (usuario) => qc.setQueryData(['usuario-atual'], usuario),
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => api.post('/auth/logout'),
    onSuccess: () => {
      // Primeiro some com o usuário (o App troca para a tela de login), depois
      // descarta os dados em cache para não sobrarem para o próximo login.
      qc.setQueryData(['usuario-atual'], null)
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'usuario-atual' })
    },
  })
}

// ---------- Proprietarios ----------

// Sem `usuarioId`, os proprietários do próprio plantel; o admin pode pedir os de outro.
export function useProprietarios(usuarioId?: number) {
  return useQuery({
    queryKey: ['proprietarios', usuarioId],
    queryFn: async () =>
      (await api.get<Proprietario[]>('/proprietarios', { params: { usuario_id: usuarioId } })).data,
  })
}

export function useCriarProprietario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dados: ProprietarioInput) =>
      (await api.post<Proprietario>('/proprietarios', dados)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proprietarios'] }),
  })
}

export function useAtualizarProprietario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dados }: { id: number; dados: ProprietarioInput }) =>
      (await api.put<Proprietario>(`/proprietarios/${id}`, dados)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proprietarios'] }),
  })
}

export function useRemoverProprietario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/proprietarios/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proprietarios'] }),
  })
}

// ---------- Pombos ----------

export function usePombos(filtro: PombosFiltro, enabled = true) {
  return useQuery({
    queryKey: ['pombos', filtro],
    queryFn: async () => (await api.get<Pombo[]>('/pombos', { params: filtro })).data,
    enabled,
  })
}

export function usePombo(id: number | undefined) {
  return useQuery({
    queryKey: ['pombo', id],
    queryFn: async () => (await api.get<PomboDetail>(`/pombos/${id}`)).data,
    enabled: id !== undefined,
  })
}

export function useCriarPombo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dados: PomboInput) => (await api.post<Pombo>('/pombos', dados)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pombos'] }),
  })
}

export function useAtualizarPombo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dados }: { id: number; dados: PomboInput }) =>
      (await api.put<Pombo>(`/pombos/${id}`, dados)).data,
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['pombos'] })
      qc.invalidateQueries({ queryKey: ['pombo', id] })
      qc.invalidateQueries({ queryKey: ['arvore', id] })
    },
  })
}

export function useRemoverPombo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/pombos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pombos'] }),
  })
}

export function useCopiarPombo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => (await api.post<Pombo>(`/pombos/${id}/copiar`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pombos'] })
      qc.invalidateQueries({ queryKey: ['proprietarios'] })
    },
  })
}

export type GenitorInput =
  | { papel: 'pai' | 'mae'; genitor_id: number }
  | { papel: 'pai' | 'mae'; novo: { anilha: string; cor?: string | null } }

/** PE-xx: preenche a vaga de pai ou mãe pela árvore (liga existente ou cadastra e liga). */
export function usePreencherGenitor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ filhoId, dados }: { filhoId: number; dados: GenitorInput }) =>
      (await api.post<Pombo>(`/pombos/${filhoId}/genitor`, dados)).data,
    onSuccess: () => {
      for (const chave of ['arvore', 'pombo', 'pombos', 'irmaos']) qc.invalidateQueries({ queryKey: [chave] })
    },
  })
}

/**
 * Árvore com as gerações que ela realmente tem. Ao trocar o número de gerações, a árvore
 * anterior continua na tela até a nova chegar (sem piscar), desenhada com as gerações dela.
 */
export function useArvore(id: number | undefined, geracoes = 4) {
  return useQuery({
    queryKey: ['arvore', id, geracoes],
    queryFn: async () => ({
      raiz: (await api.get<ArvoreNo>(`/pombos/${id}/arvore`, { params: { geracoes } })).data,
      geracoes,
    }),
    enabled: id !== undefined,
    placeholderData: keepPreviousData,
  })
}

export function useIrmaos(id: number | undefined) {
  return useQuery({
    queryKey: ['irmaos', id],
    queryFn: async () => (await api.get<IrmaosResponse>(`/pombos/${id}/irmaos`)).data,
    enabled: id !== undefined,
  })
}

// ---------- Resultados ----------

export function useResultados(pomboId: number | undefined) {
  return useQuery({
    queryKey: ['resultados', pomboId],
    queryFn: async () => (await api.get<Resultado[]>(`/pombos/${pomboId}/resultados`)).data,
    enabled: pomboId !== undefined,
  })
}

export function useCriarResultado(pomboId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dados: ResultadoInput) =>
      (await api.post<Resultado>(`/pombos/${pomboId}/resultados`, dados)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resultados', pomboId] })
      qc.invalidateQueries({ queryKey: ['arvore', pomboId] })
      qc.invalidateQueries({ queryKey: ['resultados-recentes'] })
    },
  })
}

export function useAtualizarResultado(pomboId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dados }: { id: number; dados: ResultadoInput }) =>
      (await api.put<Resultado>(`/pombos/${pomboId}/resultados/${id}`, dados)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resultados', pomboId] })
      qc.invalidateQueries({ queryKey: ['arvore', pomboId] })
      qc.invalidateQueries({ queryKey: ['resultados-recentes'] })
    },
  })
}

export function useRemoverResultado(pomboId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/pombos/${pomboId}/resultados/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resultados', pomboId] })
      qc.invalidateQueries({ queryKey: ['arvore', pomboId] })
      qc.invalidateQueries({ queryKey: ['resultados-recentes'] })
    },
  })
}

/** IN-04: últimos resultados do próprio plantel. */
export function useResultadosRecentes(limite = 5) {
  return useQuery({
    queryKey: ['resultados-recentes', limite],
    queryFn: async () => (await api.get<ResultadoRecente[]>('/resultados/recentes', { params: { limite } })).data,
  })
}

// ---------- Compartilhamento de plantel ----------

export function useCompartilhamentos() {
  return useQuery({
    queryKey: ['compartilhamentos'],
    queryFn: async () => (await api.get<Compartilhamentos>('/compartilhamentos')).data,
  })
}

export function useCompartilhar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (login: string) =>
      (await api.post<Compartilhamentos>('/compartilhamentos', { login })).data,
    onSuccess: (dados) => qc.setQueryData(['compartilhamentos'], dados),
  })
}

export function useRemoverCompartilhamento() {
  const qc = useQueryClient()
  return useMutation({
    // "concedidos": deixo de compartilhar com o usuário; "recebidos": deixo de ver o plantel dele.
    mutationFn: async ({ tipo, usuarioId }: { tipo: 'concedidos' | 'recebidos'; usuarioId: number }) =>
      api.delete(`/compartilhamentos/${tipo}/${usuarioId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compartilhamentos'] })
      qc.invalidateQueries({ queryKey: ['pombos'] })
    },
  })
}

// ---------- Usuários (só admin) ----------

export function useUsuarios() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => (await api.get<UsuarioAdmin[]>('/usuarios')).data,
  })
}

export function useCriarUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dados: UsuarioNovo) => (await api.post<UsuarioAdmin>('/usuarios', dados)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}

export function useAtualizarUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...dados }: { id: number; nome?: string; admin?: boolean; ativo?: boolean }) =>
      (await api.patch<UsuarioAdmin>(`/usuarios/${id}`, dados)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      qc.invalidateQueries({ queryKey: ['usuario-atual'] })
    },
  })
}

export function useRedefinirSenha() {
  return useMutation({
    mutationFn: async ({ id, senha }: { id: number; senha: string }) =>
      api.post(`/usuarios/${id}/senha`, { senha }),
  })
}

export function useDesbloquearUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => api.post(`/usuarios/${id}/desbloquear`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}

/** Mensagem legível de um erro da API (texto simples ou lista de validação do FastAPI). */
export function mensagemDeErro(erro: unknown, padrao: string): string {
  if (!isAxiosError(erro)) return padrao
  const detail = erro.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg).replace(/^Value error, /, '')
  return padrao
}

/** RF-02: a API respondeu 404 (o recurso não existe ou o usuário não pode vê-lo). */
export function eNaoEncontrado(erro: unknown): boolean {
  return isAxiosError(erro) && erro.response?.status === 404
}
