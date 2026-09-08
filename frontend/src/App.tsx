import { Route, Routes } from 'react-router-dom'

import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { PomboDetail } from './pages/pombos/PomboDetail'
import { PomboForm } from './pages/pombos/PomboForm'
import { PombosList } from './pages/pombos/PombosList'
import { Proprietarios } from './pages/Proprietarios'
import { Reprodutores } from './pages/Reprodutores'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pombos" element={<PombosList />} />
        <Route path="/pombos/novo" element={<PomboForm />} />
        <Route path="/pombos/:id" element={<PomboDetail />} />
        <Route path="/pombos/:id/editar" element={<PomboForm />} />
        <Route path="/reprodutores" element={<Reprodutores />} />
        <Route path="/proprietarios" element={<Proprietarios />} />
      </Routes>
    </Layout>
  )
}

export default App
