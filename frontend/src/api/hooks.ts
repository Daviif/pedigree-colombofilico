import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from './client'
import type {
  ArvoreNo,
  IrmaosResponse,
  Pombo,
  PomboDetail,
  PomboInput,
  PombosFiltro,
  Proprietario,
  ProprietarioInput,
  Resultado,
  ResultadoInput,
} from './types'

// ---------- Proprietarios ----------

export function useProprietarios() {
  return useQuery({
    queryKey: ['proprietarios'],
    queryFn: async () => (await api.get<Proprietario[]>('/proprietarios')).data,
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

export function usePombos(filtro: PombosFiltro) {
  return useQuery({
    queryKey: ['pombos', filtro],
    queryFn: async () => (await api.get<Pombo[]>('/pombos', { params: filtro })).data,
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

export function useArvore(id: number | undefined, geracoes = 4) {
  return useQuery({
    queryKey: ['arvore', id, geracoes],
    queryFn: async () =>
      (await api.get<ArvoreNo>(`/pombos/${id}/arvore`, { params: { geracoes } })).data,
    enabled: id !== undefined,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resultados', pomboId] }),
  })
}

export function useAtualizarResultado(pomboId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dados }: { id: number; dados: ResultadoInput }) =>
      (await api.put<Resultado>(`/pombos/${pomboId}/resultados/${id}`, dados)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resultados', pomboId] }),
  })
}

export function useRemoverResultado(pomboId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/pombos/${pomboId}/resultados/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resultados', pomboId] }),
  })
}
