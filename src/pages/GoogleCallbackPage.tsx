import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'

function decodeJwtPayload(token: string) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(atob(base64))
}

export default function GoogleCallbackPage() {
  const { login }   = useAuth()
  const navigate    = useNavigate()
  const processed   = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    const params = new URLSearchParams(window.location.search)
    const token  = params.get('token')

    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    const user = decodeJwtPayload(token)
    login(token, user)
    navigate('/', { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <p style={{ textAlign: 'center', marginTop: '4rem' }}>Iniciando sesión con Google...</p>
}
