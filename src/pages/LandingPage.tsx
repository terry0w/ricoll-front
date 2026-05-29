import { Link } from 'react-router-dom'

import heroImg from '../assets/hero.png'
import { useAuth } from '../contexts/AuthContext'

const FEATURES = [
  {
    icon: '🃏',
    title: 'Catálogo completo',
    desc: 'Todas las cartas de Riftbound con imágenes en alta resolución, precios de mercado y filtros por set, rareza y dominio.',
    href: '/catalog',
    cta: 'Explorar catálogo',
  },
  {
    icon: '📦',
    title: 'Tu colección',
    desc: 'Registra qué cartas tienes, cuántas y en qué variante. Controla tu inventario al detalle.',
    href: '/collection',
    cta: 'Ver mi colección',
  },
  {
    icon: '⚔️',
    title: 'Constructor de decks',
    desc: 'Construye y versiona tus listas. Registra resultados de partidas y consulta el win rate de cada deck.',
    href: '/decks',
    cta: 'Mis decks',
  },
  {
    icon: '🌐',
    title: 'Explorar listas públicas',
    desc: 'Descubre los decks de otros jugadores. Ve qué cartas te faltan para copiar una lista y su coste estimado.',
    href: '/decks/explore',
    cta: 'Ver listas',
  },
  {
    icon: '🖨️',
    title: 'Proxys para imprimir',
    desc: 'Genera PDFs listos para imprimir con cartas proxy a exactamente 63×88mm. Sin configuración extra.',
    href: '/proxy',
    cta: 'Generar proxys',
  },
]

export default function LandingPage() {
  const { user } = useAuth()

  return (
    <div className="lp-wrap">

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-glow lp-glow--a" />
        <div className="lp-glow lp-glow--b" />

        <div className="lp-hero-text">
          <span className="lp-badge">✦ Gestión de cartas para Riftbound</span>
          <h1 className="lp-title">
            Todo sobre<br />
            tu <span className="lp-title-gradient">colección</span><br />
            en un lugar
          </h1>
          <p className="lp-subtitle">
            Catálogo, colección personal, constructor de decks,
            explorador de listas y generador de proxys. Integrado y gratuito.
          </p>
          <div className="lp-actions">
            {user ? (
              <Link to="/catalog" className="btn-accent btn-lg lp-btn-main">Ir al catálogo →</Link>
            ) : (
              <>
                <Link to="/register" className="btn-accent btn-lg lp-btn-main">Empezar gratis →</Link>
                <Link to="/catalog"  className="btn-outline btn-lg">Ver catálogo</Link>
              </>
            )}
          </div>
        </div>

        <div className="lp-hero-img-wrap">
          <div className="lp-hero-img-glow" />
          <img src={heroImg} alt="Riftbound cards" className="lp-hero-img" />
        </div>
      </section>

      {/* ── Features ── */}
      <section className="lp-features">
        <div className="lp-section-header">
          <h2 className="lp-section-title">Todo lo que necesitas</h2>
          <p className="lp-section-sub">Cinco herramientas integradas para sacar el máximo a tu colección</p>
        </div>

        <div className="lp-features-grid">
          {FEATURES.map(f => (
            <Link key={f.href} to={f.href} className="lp-feature-card">
              <span className="lp-feature-icon">{f.icon}</span>
              <h3 className="lp-feature-title">{f.title}</h3>
              <p className="lp-feature-desc">{f.desc}</p>
              <span className="lp-feature-cta">{f.cta} →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTA final ── */}
      {!user && (
        <section className="lp-cta-section">
          <div className="lp-cta-card">
            <div className="lp-glow lp-glow--c" />
            <h2 className="lp-cta-title">Empieza ahora, es gratis</h2>
            <p className="lp-cta-sub">Crea tu cuenta con email o Google en menos de un minuto.</p>
            <div className="lp-actions lp-actions--center">
              <Link to="/register" className="btn-accent btn-lg lp-btn-main">Crear cuenta</Link>
              <Link to="/login"    className="btn-outline btn-lg">Iniciar sesión</Link>
            </div>
          </div>
        </section>
      )}

    </div>
  )
}
