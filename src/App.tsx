import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'

import './App.css'
import Navbar from './components/Navbar'
import { AuthProvider } from './contexts/AuthContext'
import CatalogPage from './pages/CatalogPage'
import CollectionPage from './pages/CollectionPage'
import DeckBuilderPage from './pages/DeckBuilderPage'
import DeckDetailPage from './pages/DeckDetailPage'
import DecksPage from './pages/DecksPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/"                element={<LandingPage />} />
          <Route path="/catalog"           element={<CatalogPage />} />
          <Route path="/collection"        element={<CollectionPage />} />
          <Route path="/decks"           element={<DecksPage />} />
          <Route path="/decks/new"        element={<DeckBuilderPage />} />
          <Route path="/decks/:id/edit"  element={<DeckBuilderPage />} />
          <Route path="/decks/:id"       element={<DeckDetailPage />} />
          <Route path="/login"           element={<LoginPage />} />
          <Route path="/register"        element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}
