import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import { queryClient } from './api/client'
import App from './App.tsx'
import { ProvedorNotificacao } from './components/ui'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ProvedorNotificacao>
          <App />
        </ProvedorNotificacao>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
