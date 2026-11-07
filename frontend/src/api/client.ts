import { QueryClient } from '@tanstack/react-query'
import axios, { isAxiosError } from 'axios'

export const api = axios.create({
  baseURL: '/api',
})

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Erros 4xx (sessão expirada, sem permissão, não encontrado) não melhoram tentando
      // de novo; só falha de rede e erro do servidor (5xx) são repetidos.
      retry: (falhas, erro) => {
        const status = isAxiosError(erro) ? erro.response?.status : undefined
        return !(status && status >= 400 && status < 500) && falhas < 2
      },
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
