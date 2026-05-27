import { Link, NavLink, useNavigate } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="navbar-wrap">
    <nav className="navbar">
      <Link to="/" className="navbar-brand">Ricoll</Link>

      {/* NavLink automatically adds the "active" class when on that route */}
      <div className="navbar-links">
        <NavLink to="/catalog" className="nav-link">Catálogo</NavLink>
        <NavLink to="/decks"   className="nav-link">Decks</NavLink>
      </div>

      <div className="navbar-actions">
        {user ? (
          <>
            <span className="navbar-user">{user.nickname}</span>
            <button className="btn-outline" onClick={handleLogout}>Cerrar sesión</button>
          </>
        ) : (
          <>
            <Link to="/login"    className="btn-outline">Iniciar sesión</Link>
            <Link to="/register" className="btn-accent">Registrarse</Link>
          </>
        )}
      </div>
    </nav>
    </div>
  )
}
