import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'

export default function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail]       = useState('')
  const [username, setUsername] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, nickname, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(Array.isArray(data.message) ? data.message[0] : data.message)
        return
      }

      const { token, user } = await res.json()
      login(token, user)
      navigate('/')
    } catch {
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <h2 className="auth-title">Crear cuenta</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className="form-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Nombre</label>
          <input
            className="form-input"
            type="text"
            placeholder="Tu nombre real (privado)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={2}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Nickname</label>
          <input
            className="form-input"
            type="text"
            placeholder="Tu nombre público único"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            minLength={3}
            pattern="^[a-zA-Z0-9_-]+$"
            title="Solo letras, números, guiones y guiones bajos"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Contraseña</label>
          <input
            className="form-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Confirmar contraseña</label>
          <input
            className="form-input"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>
      <p className="form-link">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </div>
  )
}
