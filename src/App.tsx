import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { BookPage } from './pages/BookPage'
import { ConfirmationPage } from './pages/ConfirmationPage'
import { ManagePage } from './pages/ManagePage'
import { AdminPage } from './pages/AdminPage'
import { isNativeApp } from './lib/native'

const Router = isNativeApp() ? HashRouter : BrowserRouter

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="book" element={<BookPage />} />
          <Route path="confirmation/:id" element={<ConfirmationPage />} />
          <Route path="manage" element={<ManagePage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  )
}
