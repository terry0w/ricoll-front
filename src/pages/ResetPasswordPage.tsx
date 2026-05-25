import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

export default function ResetPasswordPage() {
  const [searchParams]          = useSearchParams()
  const navigate                = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [message, setMessage]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const token = searchParams.get('token') ?? ''

  useEffect(() => {
    if (!token) setError('Enlace inválido. Solicita uno nuevo desde la página de recuperación.')
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(Array.isArray(data.message) ? data.message[0] : data.message)
      } else {
        setMessage(data.message)
        setTimeout(() => navigate('/login'), 2500)
      }
    } catch {
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <h2 className="auth-title">Nueva contraseña</h2>

      {message ? (
        <>
          <p className="form-success">{message}</p>
          <p className="form-link">Redirigiendo al inicio de sesión...</p>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nueva contraseña</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              disabled={!token}
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
              disabled={!token}
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="btn-primary" type="submit" disabled={loading || !token}>
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
      )}

      <p className="form-link">
        <Link to="/login">Volver al inicio de sesión</Link>
      </p>
    </div>
  )
}
