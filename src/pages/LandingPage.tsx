import { Link } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'

export default function LandingPage() {
  const { user } = useAuth()

  return (
    <div className="landing">
      <section className="hero">
        <h1 className="hero-title">Ricoll</h1>
        <p className="hero-subtitle">Tu gestor de cartas para Riftbound</p>
        <p className="hero-description">
          Explora el catálogo completo de cartas, construye tus decks y lleva
          el control de tu colección.
        </p>
        <div className="hero-actions">
          <Link to="/catalog" className="btn-accent btn-lg">Ver catálogo</Link>
          {!user && (
            <Link to="/register" className="btn-outline btn-lg">Crear cuenta</Link>
          )}
        </div>
      </section>

      <section className="features">
        <div className="feature-card">
          <span className="feature-icon">📖</span>
          <h3>Catálogo completo</h3>
          <p>Todas las cartas de Riftbound con imágenes, estadísticas y precios.</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">🃏</span>
          <h3>Constructor de decks</h3>
          <p>Crea y guarda tus decks. Próximamente.</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">📦</span>
          <h3>Tu colección</h3>
          <p>Registra las cartas que tienes y las que buscas. Próximamente.</p>
        </div>
      </section>
    </div>
  )
}
