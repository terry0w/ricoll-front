import { useEffect, useMemo, useState } from 'react'

interface PublicDeck {
  id:             string
  name:           string
  legendId:       number
  winRate:        number | null
  currentVersion: number
  updatedAt:      string
  authorNickname: string
  estimatedCost:  number | null
}

interface LegendData {
  name:     string
  imageUrl: string
}

const hqUrl   = (url: string) => url.replace('_200w.jpg', '_400w.jpg')
const baseName = (name: string) => name.replace(/\s*\(.*\)\s*$/, '').trim()

export default function PublicDecksPage() {
  const [decks,        setDecks]        = useState<PublicDeck[]>([])
  const [legendData,   setLegendData]   = useState<Record<number, LegendData>>({})
  const [loading,      setLoading]      = useState(true)
  const [nameFilter,   setNameFilter]   = useState('')
  const [legendFilter, setLegendFilter] = useState('')

  useEffect(() => {
    fetch('/api/decks/public')
      .then((r) => r.json())
      .then((data: PublicDeck[]) => {
        setDecks(data)
        setLoading(false)
        if (!data.length) return
        const uniqueIds = [...new Set(data.map((d) => d.legendId))]
        Promise.all(
          uniqueIds.map((lid) =>
            fetch(`/api/catalog/${lid}`).then((r) => r.json()).catch(() => null),
          ),
        ).then((cards) => {
          const map: Record<number, LegendData> = {}
          for (const c of cards) {
            if (c?.productId) map[c.productId] = { name: c.name, imageUrl: hqUrl(c.imageUrl ?? '') }
          }
          setLegendData(map)
        })
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return decks.filter((d) => {
      if (nameFilter && !d.name.toLowerCase().includes(nameFilter.toLowerCase())) return false
      if (legendFilter) {
        const lname = legendData[d.legendId]?.name ?? ''
        if (!lname.toLowerCase().includes(legendFilter.toLowerCase())) return false
      }
      return true
    })
  }, [decks, nameFilter, legendFilter, legendData])

  return (
    <div className="app">
      <div className="explore-header">
        <h2 className="section-title">Explorar decks</h2>
      </div>

      <div className="explore-filter-bar">
        <input
          className="search"
          type="text"
          placeholder="Buscar por nombre de deck..."
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
        />
        <input
          className="search"
          type="text"
          placeholder="Filtrar por leyenda..."
          value={legendFilter}
          onChange={(e) => setLegendFilter(e.target.value)}
        />
      </div>

      {loading && <p className="results-count">Cargando...</p>}
      {!loading && decks.length === 0 && <p className="results-count">No hay decks públicos todavía.</p>}
      {!loading && decks.length > 0 && (
        <p className="results-count">{filtered.length} deck{filtered.length !== 1 ? 's' : ''}</p>
      )}

      <div className="decks-grid">
        {filtered.map((deck) => {
          const legend = legendData[deck.legendId]
          return (
            <div key={deck.id} className="deck-card">
              <div className="deck-card-portrait">
                {legend?.imageUrl
                  ? <img src={legend.imageUrl} alt={legend.name} />
                  : <div className="deck-card-portrait-empty" />
                }
              </div>
              <div className="deck-card-info">
                <p className="deck-name">{deck.name}</p>
                <p className="deck-author">por {deck.authorNickname}</p>
                {legend?.name && (
                  <p className="deck-legend-name">{baseName(legend.name)}</p>
                )}
                <div className="deck-card-meta">
                  {deck.winRate !== null && (
                    <span className="deck-winrate">{deck.winRate}% WR</span>
                  )}
                  {deck.estimatedCost !== null && (
                    <span className="deck-cost">~${deck.estimatedCost.toFixed(2)}</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
