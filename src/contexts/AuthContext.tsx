import { createContext, useContext, useState } from 'react'

interface TokenUser {
  sub: string
  email: string
  username: string
  nickname: string
}

interface AuthContextType {
  user: TokenUser | null
  token: string | null
  login: (token: string, user: TokenUser) => void
  logout: () => void
}

// Context acts as a global reactive variable — any component can read it without prop drilling
const AuthContext = createContext<AuthContextType | null>(null)

// Custom hook so components can access auth state with a single import
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

// Provider wraps the app and makes auth state available to all children
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Restore session from localStorage on mount
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [user, setUser]   = useState<TokenUser | null>(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  const login = (newToken: string, newUser: TokenUser) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
