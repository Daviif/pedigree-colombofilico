import { QueryClient } from '@tanstack/react-query'
import axios, { isAxiosError } from 'axios'

export const api = axios.create({
  baseURL: '/api',
})

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 401 não melhora tentando de novo: a sessão expirou, volta pro login.
      retry: (falhas, erro) => !(isAxiosError(erro) && erro.response?.status === 401) && falhas < 3,
    },
  },
})

// Sessão expirada em qualquer chamada: limpa o usuário atual e o App mostra o login.
api.interceptors.response.use(undefined, (erro) => {
  if (isAxiosError(erro) && erro.response?.status === 401 && !erro.config?.url?.startsWith('/auth/')) {
    queryClient.setQueryData(['usuario-atual'], null)
  }
  return Promise.reject(erro)
})
