import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import bodyIcon  from '../assets/icons/Body.png'
import calmIcon  from '../assets/icons/Calm.png'
import chaosIcon from '../assets/icons/Chaos.png'
import furyIcon  from '../assets/icons/Fury.png'
import mindIcon  from '../assets/icons/Mind.png'
import orderIcon from '../assets/icons/Order.png'
import { useAuth } from '../contexts/AuthContext'

interface Card {
  product_id:      number
  name:            string
  image_url:       string
  ext_card_type:   string | null
  ext_domain:      string | null
  ext_rarity:      string | null
  sub_type_name:   string | null
  ext_description: string | null
  ext_flavor_text: string | null
  ext_energy_cost: number | null
  ext_power_cost:  number | null
  ext_might:       number | null
  market_price:    string | null
  low_price:       string | null
  set_name:        string
}

interface DeckCardEntry { cardId: number; quantity: number }

interface DeckSnapshot {
  legendId:         number
  chosenChampionId: number | null
  mainDeck:         DeckCardEntry[]
  runes:            DeckCardEntry[]
  battlefields:     number[]
  sideboard:        DeckCardEntry[]
}

interface DeckVersion {
  id:        string
  version:   number
  note:      string | null
  snapshot:  DeckSnapshot
  createdAt: string
}

interface DeckData {
  id:               string
  name:             string
  legal:            boolean
  public:           boolean
  winRate:          number | null
  legendId:         number
  chosenChampionId: number | null
  currentVersion:   number
  mainDeck:         DeckCardEntry[]
  runes:            DeckCardEntry[]
  battlefields:     number[]
  sideboard:        DeckCardEntry[]
  updatedAt:        string
}

const DOMAIN_ICONS: Record<string, string> = {
  fury: furyIcon, calm: calmIcon, mind: mindIcon,
  body: bodyIcon, chaos: chaosIcon, order: orderIcon,
}

const hqUrl    = (url: string) => url.replace('_200w.jpg', '_400w.jpg')
const baseName = (name: string) => name.replace(/\s*\(.*\)\s*$/, '').trim()
const isFoil   = (card: Card) => card.sub_type_name?.toLowerCase().includes('foil') ?? false

const cardType = (t: string | null): string => {
  if (!t) return ''
  const l = t.toLowerCase()
  if (l.includes('champion')) return 'Champion Unit'
  if (l.includes('unit'))     return 'Unit'
  if (l.includes('spell'))    return 'Spell'
  if (l.includes('gear'))     return 'Gear'
  if (l.includes('signature'))return 'Signature'
  if (l.includes('rune'))     return 'Rune'
  if (l.includes('battle'))   return 'Battlefield'
  return t
}

function CardModal({ card, onClose }: { card: Card; onClose: () => void }) {
  const foil = isFoil(card)
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-layout">
          <div className="modal-img">
            <div className={`card-img-wrapper ${foil ? 'foil' : ''}`}>
              {card.image_url && <img src={hqUrl(card.image_url)} alt={card.name} />}
            </div>
          </div>
          <div className="modal-info">
            <h2 className="modal-name">{card.name}</h2>
            <div className="modal-meta">
              <div className="meta-col">
                {card.ext_card_type && (
                  <div className="meta-row">
                    <span className="meta-label">Tipo</span>
                    <span className="meta-value">{cardType(card.ext_card_type)}</span>
                  </div>
                )}
                {card.ext_rarity && (
                  <div className="meta-row">
                    <span className="meta-label">Rareza</span>
                    <span className="meta-value">{card.ext_rarity}</span>
                  </div>
                )}
                {card.set_name && (
                  <div className="meta-row">
                    <span className="meta-label">Set</span>
                    <span className="meta-value" style={{ textTransform: 'capitalize' }}>{card.set_name}</span>
                  </div>
                )}
              </div>
              <div className="meta-col">
                {card.ext_domain && (
                  <div className="meta-row">
                    <span className="meta-label">Dominio</span>
                    <span className="meta-domains" style={{ display: 'flex', gap: 4 }}>
                      {card.ext_domain.split(';').map((d) => (
                        <img key={d} src={DOMAIN_ICONS[d.trim().toLowerCase()]} alt={d} className="domain-pip" />
                      ))}
                    </span>
                  </div>
                )}
                {card.ext_energy_cost != null && (
                  <div className="meta-row">
                    <span className="meta-label">Coste</span>
                    <span className="meta-stat">{card.ext_energy_cost}</span>
                  </div>
                )}
                {card.ext_might != null && (
                  <div className="meta-row">
                    <span className="meta-label">Might</span>
                    <span className="meta-stat">{card.ext_might}</span>
                  </div>
                )}
              </div>
            </div>
            {card.ext_description && (
              <p className="modal-description">{card.ext_description}</p>
            )}
            {card.ext_flavor_text && (
              <p className="modal-flavor">"{card.ext_flavor_text}"</p>
            )}
            <div className="modal-footer">
              {foil && <span className="footer-foil">Foil</span>}
              <div className="footer-prices">
                {card.market_price && <span>${card.market_price}</span>}
                {card.low_price && <span>Low ${card.low_price}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DdCard({ card, onClick }: { card: Card; onClick: () => void }) {
  return (
    <div className={`dd-card ${isFoil(card) ? 'foil' : ''}`} onClick={onClick}>
      {card.image_url
        ? <img src={hqUrl(card.image_url)} alt={card.name} draggable={false} />
        : <div className="dd-card-noimg">{baseName(card.name)}</div>
      }
      <p className="dd-card-name">{baseName(card.name)}</p>
    </div>
  )
}

function CompactCard({ card, quantity, onClick }: { card: Card; quantity: number; onClick: () => void }) {
  return (
    <div className={`dd-compact-card ${isFoil(card) ? 'foil' : ''}`} onClick={onClick}>
      {card.image_url
        ? <img src={hqUrl(card.image_url)} alt={card.name} draggable={false} />
        : <div className="dd-compact-noimg">{baseName(card.name)}</div>
      }
      {quantity > 1 && <span className="dd-compact-qty">×{quantity}</span>}
    </div>
  )
}

export default function DeckDetailPage() {
  const { id }    = useParams<{ id: string }>()
  const { token } = useAuth()
  const navigate  = useNavigate()

  const [deck,         setDeck]         = useState<DeckData | null>(null)
  const [allCards,     setAllCards]     = useState<Card[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [publishing,   setPublishing]   = useState(false)
  const [versions,     setVersions]     = useState<DeckVersion[] | null>(null)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [versionsLoading, setVersionsLoading] = useState(false)

  useEffect(() => {
    if (!token || !id) return
    Promise.all([
      fetch(`/api/decks/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch('/api/catalog/cards?limit=5000').then((r) => r.json()),
    ])
      .then(([deckData, cards]) => {
        if (deckData?.statusCode >= 400) { setError('Deck no encontrado'); return }
        setDeck(deckData)
        setAllCards(cards)
      })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false))
  }, [id, token])

  const togglePublic = async () => {
    if (!deck || !token) return
    setPublishing(true)
    try {
      const res = await fetch(`/api/decks/${id}/public`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ public: !deck.public }),
      })
      if (res.ok) {
        const updated = await res.json()
        setDeck(updated)
      }
    } finally {
      setPublishing(false)
    }
  }

  const toggleVersions = async () => {
    if (!versionsOpen && versions === null) {
      setVersionsLoading(true)
      try {
        const res = await fetch(`/api/decks/${id}/versions`, { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        setVersions(data.sort((a: DeckVersion, b: DeckVersion) => b.version - a.version))
      } finally {
        setVersionsLoading(false)
      }
    }
    setVersionsOpen((o) => !o)
  }

  const cardMap = useMemo(() => {
    const m = new Map<number, Card>()
    allCards.forEach((c) => m.set(c.product_id, c))
    return m
  }, [allCards])

  if (!token) return <div className="empty-page"><p>Inicia sesión para ver tus decks.</p></div>
  if (loading) return <div className="app"><p className="results-count">Cargando...</p></div>
  if (error || !deck) return <div className="app"><p className="results-count">{error || 'Deck no encontrado'}</p></div>

  const legend   = cardMap.get(deck.legendId)
  const champion = deck.chosenChampionId ? cardMap.get(deck.chosenChampionId) : null
  const bfCards  = deck.battlefields.map((bId) => cardMap.get(bId)).filter(Boolean) as Card[]
  const deckTotal = deck.mainDeck.reduce((s, e) => s + e.quantity, 0)

  const runeCards = (Array.isArray(deck.runes) ? deck.runes : []).flatMap(({ cardId, quantity }) => {
    const card = cardMap.get(cardId)
    return card ? Array<Card>(quantity).fill(card) : []
  })

  const mainCardsRaw = deck.mainDeck.flatMap(({ cardId, quantity }) => {
    const card = cardMap.get(cardId)
    return card ? Array<Card>(quantity).fill(card) : []
  })

  // Champion first
  const mainCards = [
    ...mainCardsRaw.filter((c) => c.product_id === deck.chosenChampionId),
    ...mainCardsRaw.filter((c) => c.product_id !== deck.chosenChampionId),
  ]

  const sideCards = deck.sideboard.flatMap(({ cardId, quantity }) => {
    const card = cardMap.get(cardId)
    return card ? Array<Card>(quantity).fill(card) : []
  })

  return (
    <div className="deck-detail">

      {/* ── Header ── */}
      <div className="dd-header">
        {legend?.image_url && (
          <img
            src={hqUrl(legend.image_url)}
            alt={legend.name}
            className="dd-legend-hero"
            onClick={() => setSelectedCard(legend)}
            style={{ cursor: 'pointer' }}
          />
        )}
        <div className="dd-header-info">
          <h1 className="dd-name">{deck.name}</h1>
          <div className="dd-badges">
            <span className={`badge ${deck.legal ? 'badge-legal' : 'badge-illegal'}`}>
              {deck.legal ? 'Legal' : 'Ilegal'}
            </span>
            <label className={`dd-publish-toggle ${!deck.legal ? 'dd-publish-disabled' : ''}`}>
              <input
                type="checkbox"
                checked={deck.public}
                disabled={publishing || !deck.legal}
                onChange={togglePublic}
              />
              Publicar
            </label>
          </div>
          {legend && (
            <p className="dd-meta-line">
              <span className="dd-meta-label">Legend</span>
              {legend.ext_domain && (
                <span className="dd-meta-domains">
                  {legend.ext_domain.split(';').map((d) => (
                    <img key={d} src={DOMAIN_ICONS[d.trim().toLowerCase()]} alt={d} className="domain-pip" />
                  ))}
                </span>
              )}
              {legend.name}
            </p>
          )}
          {champion && (
            <p className="dd-meta-line">
              <span className="dd-meta-label">Chosen</span>
              {champion.name}
            </p>
          )}
          <div className="dd-stats">
            <span>{deckTotal}/40 cartas</span>
            {runeCards.length > 0 && <span>{runeCards.length}/12 runas</span>}
            {deck.winRate !== null && <span className="dd-winrate">{deck.winRate}% WR</span>}
            <span className="dd-version">v{deck.currentVersion}</span>
          </div>
          <button className="btn-accent dd-edit-btn" onClick={() => navigate(`/decks/${id}/edit`)}>
            Editar deck
          </button>

        </div>
      </div>

      {/* ── Body ── */}
      <div className="dd-body">

        {/* Runas — fila única compacta */}
        {runeCards.length > 0 && (
          <div className="dd-type-section">
            <div className="dd-type-label">
              Runas <span className="dd-type-count">{runeCards.length}/12</span>
            </div>
            <div className="dd-rune-strip">
              {runeCards.map((card, i) => (
                <div key={`${card.product_id}-rune-${i}`} className="dd-rune-mini" onClick={() => setSelectedCard(card)}>
                  {card.image_url
                    ? <img src={hqUrl(card.image_url)} alt={card.name} draggable={false} />
                    : <div className="dd-rune-mini-noimg" />
                  }
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Battlefields — fila completa */}
        {bfCards.length > 0 && (
          <div className="dd-type-section">
            <div className="dd-type-label">
              Battlefields <span className="dd-type-count">{bfCards.length}/3</span>
            </div>
            <div className="dd-bf-full-row">
              {bfCards.map((c) => (
                <div key={c.product_id} className={`dd-bf-full-card${c.set_name === 'origins' ? ' origins' : ''}`} onClick={() => setSelectedCard(c)}>
                  {c.image_url
                    ? <img src={hqUrl(c.image_url)} alt={c.name} draggable={false} />
                    : <div className="dd-bf-noimg">{c.name}</div>
                  }
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mazo principal */}
        {mainCards.length > 0 && (
          <div className="dd-type-section">
            <div className="dd-type-label">
              Mazo <span className="dd-type-count">{mainCards.length}/40</span>
            </div>
            <div className="dd-card-grid">
              {mainCards.map((card, i) => (
                <DdCard key={`${card.product_id}-${i}`} card={card} onClick={() => setSelectedCard(card)} />
              ))}
            </div>
          </div>
        )}

        {/* Sideboard */}
        {sideCards.length > 0 && (
          <div className="dd-type-section">
            <div className="dd-type-label">
              Sideboard <span className="dd-type-count">{sideCards.length}/8</span>
            </div>
            <div className="dd-card-grid">
              {sideCards.map((card, i) => (
                <DdCard key={`${card.product_id}-side-${i}`} card={card} onClick={() => setSelectedCard(card)} />
              ))}
            </div>
          </div>
        )}

        {/* Historial de versiones */}
        <div className="dd-versions">
          <button className="dd-versions-toggle" onClick={toggleVersions}>
            <span>Historial de versiones</span>
            <span className={`dd-versions-chevron ${versionsOpen ? 'open' : ''}`}>▾</span>
          </button>

          {versionsOpen && (
            <div className="dd-versions-body">
              {versionsLoading && <p className="dd-versions-empty">Cargando...</p>}
              {versions && versions.length === 0 && (
                <p className="dd-versions-empty">Sin versiones guardadas.</p>
              )}
              {versions && versions.map((v) => {
                const snap = v.snapshot
                const allEntries = [
                  ...snap.mainDeck,
                  ...(Array.isArray(snap.runes) ? snap.runes : []),
                  ...snap.battlefields.map((bId) => ({ cardId: bId, quantity: 1 })),
                  ...(snap.sideboard ?? []),
                ]
                return (
                  <div key={v.id} className="dd-version-entry">
                    <div className="dd-version-header">
                      <span className="dd-version-num">v{v.version}</span>
                      {v.note && <span className="dd-version-note">{v.note}</span>}
                      <span className="dd-version-date">
                        {new Date(v.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="dd-compact-grid">
                      {allEntries.map(({ cardId, quantity }) => {
                        const card = cardMap.get(cardId)
                        if (!card) return null
                        return (
                          <CompactCard
                            key={cardId}
                            card={card}
                            quantity={quantity}
                            onClick={() => setSelectedCard(card)}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {selectedCard && <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />}
    </div>
  )
}
