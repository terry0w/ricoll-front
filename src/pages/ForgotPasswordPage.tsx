import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('')
  const [message, setMessage]       = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(Array.isArray(data.message) ? data.message[0] : data.message)
      } else {
        setMessage(data.message)
      }
    } catch {
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <h2 className="auth-title">Recuperar contraseña</h2>
      <p className="auth-subtitle">Introduce tu email o nickname y te enviaremos un enlace.</p>

      {message ? (
        <p className="form-success">{message}</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email o nickname</label>
            <input
              className="form-input"
              type="text"
              placeholder="Email o nickname"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>
      )}

      <p className="form-link">
        <Link to="/login">Volver al inicio de sesión</Link>
      </p>
    </div>
  )
}
