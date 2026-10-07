import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Home from './pages/Home/Home'
import ArView from './pages/ArView/ArView'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/ar/:id" element={<ArView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
