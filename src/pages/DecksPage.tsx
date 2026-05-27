import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'

interface DeckSummary {
  id:             string
  name:           string
  legal:          boolean
  public:         boolean
  winRate:        number | null
  legendId:       number
  currentVersion: number
  updatedAt:      string
}

interface LegendCard {
  productId: number
  imageUrl:  string
  name:      string
}

const hqUrl = (url: string) => url.replace('_200w.jpg', '_400w.jpg')

export default function DecksPage() {
  const { token } = useAuth()
  const navigate  = useNavigate()

  const [decks,         setDecks]         = useState<DeckSummary[]>([])
  const [legendImages,  setLegendImages]  = useState<Record<number, string>>({})
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    if (!token) { setLoading(false); return }
    fetch('/api/decks/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data: DeckSummary[]) => {
        setDecks(data)
        setLoading(false)
        if (!data.length) return
        const uniqueIds = [...new Set(data.map((d) => d.legendId))]
        Promise.all(
          uniqueIds.map((lid) =>
            fetch(`/api/catalog/${lid}`).then((r) => r.json()).catch(() => null),
          ),
        ).then((cards: (LegendCard | null)[]) => {
          const map: Record<number, string> = {}
          cards.forEach((c) => { if (c?.imageUrl) map[c.productId] = hqUrl(c.imageUrl) })
          setLegendImages(map)
        })
      })
  }, [token])

  if (!token) {
    return (
      <div className="empty-page">
        <h2>Decks</h2>
        <p>Inicia sesión para ver y crear tus decks.</p>
        <Link to="/login" className="btn-primary" style={{ display: 'inline-block', marginTop: 16 }}>
          Iniciar sesión
        </Link>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="decks-header">
        <h2 className="section-title">Mis decks</h2>
        <button className="btn-primary" onClick={() => navigate('/decks/new')}>
          + Nuevo deck
        </button>
      </div>

      {loading && <p className="results-count">Cargando...</p>}

      {!loading && decks.length === 0 && (
        <div className="empty-state">
          <p>Todavía no tienes ningún deck.</p>
          <button className="btn-primary" onClick={() => navigate('/decks/new')}>
            Crear mi primer deck
          </button>
        </div>
      )}

      <div className="decks-grid">
        {decks.map((deck) => (
          <div key={deck.id} className="deck-card" onClick={() => navigate(`/decks/${deck.id}`)}>
            <div className="deck-card-portrait">
              {legendImages[deck.legendId]
                ? <img src={legendImages[deck.legendId]} alt={deck.name} />
                : <div className="deck-card-portrait-empty" />
              }
            </div>
            <div className="deck-card-info">
              <p className="deck-name">{deck.name}</p>
              <div className="deck-card-chips">
                <span className={`deck-chip ${deck.legal ? 'deck-chip-legal' : 'deck-chip-illegal'}`}>
                  {deck.legal ? 'Legal' : 'Ilegal'}
                </span>
                {deck.public && <span className="deck-chip deck-chip-public">Público</span>}
              </div>
              <div className="deck-card-meta">
                <span>v{deck.currentVersion}</span>
                {deck.winRate !== null && (
                  <span className="deck-winrate">{deck.winRate}% WR</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
