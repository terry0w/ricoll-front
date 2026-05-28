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
  authorNickname:   string
}

interface GameEvent {
  id:     number
  name:   string
  slug:   string
  weight: number
}

type GameOutcome = 'win' | 'loss' | 'draw'

interface EventMatch {
  opponentLegendId: number
  rounds:           GameOutcome[]
}

interface DeckEventData {
  id:        string
  gameEvent: GameEvent
  matches:   EventMatch[]
  createdAt: string
}

interface MatchForm {
  opponentLegendId: number | null
  roundCount:       number
  rounds:           (GameOutcome | null)[]
  legendSearch:     string
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

const OUTCOME_CFG: Record<GameOutcome, { label: string; cls: string }> = {
  win:  { label: '+', cls: 'win'  },
  draw: { label: '○', cls: 'draw' },
  loss: { label: '−', cls: 'loss' },
}

function matchResult(rounds: GameOutcome[]): GameOutcome {
  const w = rounds.filter((r) => r === 'win').length
  const l = rounds.filter((r) => r === 'loss').length
  return w > l ? 'win' : l > w ? 'loss' : 'draw'
}

function eventResult(matches: EventMatch[]): GameOutcome {
  const results = matches.map((m) => matchResult(m.rounds))
  const w = results.filter((r) => r === 'win').length
  const l = results.filter((r) => r === 'loss').length
  return w > l ? 'win' : l > w ? 'loss' : 'draw'
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

  // Results
  const [gameEvents,  setGameEvents]  = useState<GameEvent[]>([])
  const [events,      setEvents]      = useState<DeckEventData[]>([])
  const [formOpen,    setFormOpen]    = useState(false)
  const [selEventId,  setSelEventId]  = useState<number | null>(null)
  const [matches,         setMatches]         = useState<MatchForm[]>([{ opponentLegendId: null, roundCount: 3, rounds: [null, null, null], legendSearch: '' }])
  const [submitting,      setSubmitting]      = useState(false)
  const [editingEventId,  setEditingEventId]  = useState<string | null>(null)

  // Shopping list
  const [collection,   setCollection]   = useState<Map<string, number> | null>(null)

  useEffect(() => {
    if (!token || !id) return
    Promise.all([
      fetch(`/api/decks/${id}`,         { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch('/api/catalog/cards?limit=5000').then((r) => r.json()),
      fetch('/api/decks/game-events/all').then((r) => r.json()),
      fetch(`/api/decks/${id}/events`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([deckData, cards, evTypes, evResults]) => {
        if (deckData?.statusCode >= 400) { setError('Deck no encontrado'); return }
        setDeck(deckData)
        setAllCards(cards)
        if (Array.isArray(evTypes)) {
          setGameEvents(evTypes)
          setSelEventId(evTypes[0]?.id ?? null)
        }
        if (Array.isArray(evResults)) setEvents(evResults)
      })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false))
  }, [id, token])

  useEffect(() => {
    if (!token) return
    fetch('/api/collection', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data: { productId: number; subTypeName: string; quantity: number }[]) => {
        const map = new Map<string, number>()
        for (const e of data) map.set(`${e.productId}:${e.subTypeName}`, e.quantity)
        setCollection(map)
      })
      .catch(() => {})
  }, [token])

  const togglePublic = async () => {
    if (!deck || !token) return
    setPublishing(true)
    try {
      const res = await fetch(`/api/decks/${id}/public`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ public: !deck.public }),
      })
      if (res.ok) setDeck(await res.json())
    } finally {
      setPublishing(false)
    }
  }

  const toggleVersions = async () => {
    if (!versionsOpen && versions === null) {
      setVersionsLoading(true)
      try {
        const res  = await fetch(`/api/decks/${id}/versions`, { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        setVersions(data.sort((a: DeckVersion, b: DeckVersion) => b.version - a.version))
      } finally {
        setVersionsLoading(false)
      }
    }
    setVersionsOpen((o) => !o)
  }

  const addMatch = () =>
    setMatches((prev) => [...prev, { opponentLegendId: null, roundCount: 3, rounds: [null, null, null], legendSearch: '' }])

  const removeMatch = (idx: number) =>
    setMatches((prev) => prev.filter((_, i) => i !== idx))

  const setMatchLegend = (idx: number, legendId: number) =>
    setMatches((prev) => prev.map((m, i) => i === idx ? { ...m, opponentLegendId: legendId } : m))

  const setMatchLegendSearch = (idx: number, val: string) =>
    setMatches((prev) => prev.map((m, i) => i === idx ? { ...m, legendSearch: val } : m))

  const setMatchRoundCount = (idx: number, n: number) =>
    setMatches((prev) => prev.map((m, i) => {
      if (i !== idx) return m
      const rounds = [...m.rounds]
      while (rounds.length < n) rounds.push(null)
      return { ...m, roundCount: n, rounds: rounds.slice(0, n) }
    }))

  const setMatchRound = (matchIdx: number, roundIdx: number, val: GameOutcome) =>
    setMatches((prev) => prev.map((m, i) => {
      if (i !== matchIdx) return m
      const rounds = [...m.rounds]
      rounds[roundIdx] = rounds[roundIdx] === val ? null : val
      return { ...m, rounds }
    }))

  const resetForm = () => {
    setMatches([{ opponentLegendId: null, roundCount: 3, rounds: [null, null, null], legendSearch: '' }])
    setEditingEventId(null)
    setFormOpen(false)
  }

  const startEdit = (ev: DeckEventData) => {
    setSelEventId(ev.gameEvent.id)
    setMatches(ev.matches.map((m) => ({
      opponentLegendId: m.opponentLegendId,
      roundCount:       m.rounds.length,
      rounds:           [...m.rounds] as (GameOutcome | null)[],
      legendSearch:     '',
    })))
    setEditingEventId(ev.id)
    setFormOpen(true)
  }

  const submitEvent = async () => {
    if (!token || !selEventId) return
    if (matches.some((m) => m.opponentLegendId === null || m.rounds.some((r) => r === null))) return
    setSubmitting(true)
    try {
      const url    = editingEventId ? `/api/decks/${id}/events/${editingEventId}` : `/api/decks/${id}/events`
      const method = editingEventId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          gameEventId: selEventId,
          matches: matches.map((m) => ({
            opponentLegendId: m.opponentLegendId,
            rounds: m.rounds.filter((r): r is GameOutcome => r !== null),
          })),
        }),
      })
      if (res.ok) {
        const saved = await res.json()
        if (editingEventId) {
          setEvents((prev) => prev.map((e) => e.id === editingEventId ? saved : e))
        } else {
          setEvents((prev) => [saved, ...prev])
        }
        resetForm()
        const updatedDeck = await fetch(`/api/decks/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json())
        setDeck(updatedDeck)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const cardMap = useMemo(() => {
    const m = new Map<number, Card>()
    allCards.forEach((c) => m.set(c.product_id, c))
    return m
  }, [allCards])

  const ownedByProduct = useMemo(() => {
    if (!collection) return new Map<number, number>()
    const m = new Map<number, number>()
    for (const [key, qty] of collection) {
      const pid = Number(key.split(':')[0])
      m.set(pid, (m.get(pid) ?? 0) + qty)
    }
    return m
  }, [collection])

  const shoppingEntries = useMemo(() => {
    if (!deck || collection === null) return []
    const needed = new Map<number, number>()
    const allEntries = [
      ...deck.mainDeck,
      ...(Array.isArray(deck.runes) ? deck.runes : []),
      ...deck.battlefields.map((id) => ({ cardId: id, quantity: 1 })),
      ...(deck.sideboard ?? []),
    ]
    for (const e of allEntries) needed.set(e.cardId, (needed.get(e.cardId) ?? 0) + e.quantity)
    const result: { card: Card; missing: number; lineCost: number }[] = []
    for (const [cardId, qty] of needed) {
      const owned   = ownedByProduct.get(cardId) ?? 0
      const missing = Math.max(0, qty - owned)
      if (missing === 0) continue
      const card = cardMap.get(cardId)
      if (!card) continue
      const price = Number(card.market_price ?? card.low_price ?? 0)
      result.push({ card, missing, lineCost: missing * price })
    }
    return result.sort((a, b) => b.lineCost - a.lineCost)
  }, [deck, collection, ownedByProduct, cardMap])

  const ownedEntries = useMemo(() => {
    if (!deck || collection === null) return []
    const needed = new Map<number, number>()
    const allEntries = [
      ...deck.mainDeck,
      ...(Array.isArray(deck.runes) ? deck.runes : []),
      ...deck.battlefields.map((id) => ({ cardId: id, quantity: 1 })),
      ...(deck.sideboard ?? []),
    ]
    for (const e of allEntries) needed.set(e.cardId, (needed.get(e.cardId) ?? 0) + e.quantity)
    const result: { card: Card; have: number; need: number }[] = []
    for (const [cardId, qty] of needed) {
      const owned = ownedByProduct.get(cardId) ?? 0
      if (owned === 0) continue
      const card = cardMap.get(cardId)
      if (!card) continue
      result.push({ card, have: Math.min(owned, qty), need: qty })
    }
    return result.sort((a, b) => baseName(a.card.name).localeCompare(baseName(b.card.name)))
  }, [deck, collection, ownedByProduct, cardMap])

  const shoppingTotal = useMemo(
    () => shoppingEntries.reduce((s, r) => s + r.lineCost, 0),
    [shoppingEntries],
  )

  const legendCards = useMemo(() => {
    const all = allCards.filter((c) => c.ext_card_type?.toLowerCase().includes('legend'))
    const byBase = new Map<string, Card>()
    for (const c of all) {
      const base = baseName(c.name)
      const existing = byBase.get(base)
      if (!existing) {
        byBase.set(base, c)
      } else if (
        existing.ext_rarity?.toLowerCase() !== 'rare' &&
        c.ext_rarity?.toLowerCase() === 'rare'
      ) {
        byBase.set(base, c)
      }
    }
    return Array.from(byBase.values()).sort((a, b) =>
      baseName(a.name).localeCompare(baseName(b.name))
    )
  }, [allCards])

  const canSubmit = selEventId !== null &&
    matches.length > 0 &&
    matches.every((m) => m.opponentLegendId !== null && m.rounds.some((r) => r !== null))

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

  const runeEntries = (Array.isArray(deck.runes) ? deck.runes : [])
    .map(({ cardId, quantity }) => ({ card: cardMap.get(cardId), quantity }))
    .filter((e): e is { card: Card; quantity: number } => !!e.card)

  const mainCardsRaw = deck.mainDeck.flatMap(({ cardId, quantity }) => {
    const card = cardMap.get(cardId)
    return card ? Array<Card>(quantity).fill(card) : []
  })

  const mainCards = [
    ...mainCardsRaw.filter((c) => c.product_id === deck.chosenChampionId),
    ...mainCardsRaw.filter((c) => c.product_id !== deck.chosenChampionId),
  ]

  const sideCards = deck.sideboard.flatMap(({ cardId, quantity }) => {
    const card = cardMap.get(cardId)
    return card ? Array<Card>(quantity).fill(card) : []
  })

  return (
    <div className="dd-page-layout">

      {/* ── Columna principal ── */}
      <div className="dd-main">

        {/* Header */}
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
            {deck.authorNickname && (
              <p className="dd-author">por {deck.authorNickname}</p>
            )}
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

        {/* Body */}
        <div className="dd-body">

          {(runeEntries.length > 0 || bfCards.length > 0) && (
            <div className="dd-type-section">
              <div className="dd-type-label">
                {runeEntries.length > 0 && <>Runas <span className="dd-type-count">{runeCards.length}/12</span></>}
                {runeEntries.length > 0 && bfCards.length > 0 && <span className="dd-type-label-sep">·</span>}
                {bfCards.length > 0 && <>Battlefields <span className="dd-type-count">{bfCards.length}/3</span></>}
              </div>
              <div className="dd-rune-bf-row">
                {runeEntries.map(({ card, quantity }) => (
                  <div key={card.product_id} className="dd-rune-unique" onClick={() => setSelectedCard(card)}>
                    {card.image_url
                      ? <img src={hqUrl(card.image_url)} alt={card.name} draggable={false} />
                      : <div className="dd-rune-unique-noimg" />
                    }
                    <span className="dd-rune-unique-qty">×{quantity}</span>
                  </div>
                ))}
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

          {/* Resultados de partidas — inline, encima del historial */}
          <div className="dd-results-section">
            <div className="dd-results-header">
              <h3 className="dd-results-title">Resultados de partidas</h3>
              {!formOpen && (
                <div className="dd-results-header-add">
                  <button className="dd-new-event-btn" onClick={() => setFormOpen(true)}>+ Añadir</button>
                </div>
              )}
            </div>

            {formOpen && (
              <div className="dd-results-form">
                {editingEventId && <span className="dd-form-edit-label">Editando evento</span>}
                <select className="dd-results-select" value={selEventId ?? ''} onChange={(e) => setSelEventId(Number(e.target.value))}>
                  {gameEvents.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                </select>
                {matches.map((match, mIdx) => (
                  <div key={mIdx} className="dd-match-block">
                    <div className="dd-match-block-header">
                      <span className="dd-match-label">Partida {mIdx + 1}</span>
                      {matches.length > 1 && <button className="dd-match-remove" onClick={() => removeMatch(mIdx)}>×</button>}
                    </div>
                    <input className="dd-legend-search" placeholder="Buscar leyenda oponente..." value={match.legendSearch} onChange={(e) => setMatchLegendSearch(mIdx, e.target.value)} />
                    <select className="dd-results-select" value={match.opponentLegendId ?? ''} onChange={(e) => setMatchLegend(mIdx, Number(e.target.value))}>
                      <option value="">— Selecciona leyenda —</option>
                      {(match.legendSearch.trim() ? legendCards.filter((c) => baseName(c.name).toLowerCase().includes(match.legendSearch.toLowerCase())) : legendCards).map((c) => (
                        <option key={c.product_id} value={c.product_id}>{baseName(c.name)}</option>
                      ))}
                    </select>
                    <div className="dd-game-count-row">
                      {[1,2,3,4,5].map((n) => (
                        <button key={n} className={`dd-game-count-btn${match.roundCount === n ? ' active' : ''}`} onClick={() => setMatchRoundCount(mIdx, n)}>{n}</button>
                      ))}
                    </div>
                    <div className="dd-game-slots">
                      {match.rounds.map((val, rIdx) => (
                        <div key={rIdx} className="dd-game-slot">
                          <span className="dd-game-slot-label">R{rIdx + 1}</span>
                          {(['win','draw','loss'] as GameOutcome[]).map((o) => (
                            <button key={o} className={`dd-outcome-btn dd-outcome-${o}${val === o ? ' active' : ''}`} onClick={() => setMatchRound(mIdx, rIdx, o)}>{OUTCOME_CFG[o].label}</button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button className="dd-add-match-btn" onClick={addMatch}>+ Añadir partida</button>
                <div className="dd-form-actions">
                  <button className="btn-outline" onClick={resetForm}>Cancelar</button>
                  <button className="btn-accent dd-results-submit" disabled={!canSubmit || submitting} onClick={submitEvent}>
                    {submitting ? 'Guardando...' : editingEventId ? 'Actualizar evento' : 'Guardar evento'}
                  </button>
                </div>
              </div>
            )}

            <div className="dd-results-list">
              {events.length === 0 && !formOpen && <p className="dd-results-empty">Sin eventos registrados.</p>}
              {events.map((ev) => {
                const evRes = eventResult(ev.matches)
                return (
                  <div key={ev.id} className={`dd-result-entry dd-result-entry--${evRes}`}>
                    <div className="dd-result-header">
                      <span className="dd-result-event">{ev.gameEvent.name}</span>
                      <div className="dd-result-header-right">
                        <span className="dd-result-date">{new Date(ev.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                        {!formOpen && <button className="dd-result-edit-btn" onClick={() => startEdit(ev)}>✎</button>}
                      </div>
                    </div>
                    <div className="dd-result-matches">
                      {ev.matches.map((m, i) => {
                        const opp  = cardMap.get(m.opponentLegendId)
                        const mRes = matchResult(m.rounds)
                        return (
                          <div key={i} className="dd-result-match">
                            <span className={`dd-result-match-badge dd-result-match-badge--${mRes}`}>{OUTCOME_CFG[mRes].label}</span>
                            <span className="dd-result-opp">{opp ? baseName(opp.name) : `#${m.opponentLegendId}`}</span>
                            <div className="dd-result-pips">
                              {m.rounds.map((r, ri) => <span key={ri} className={`dd-result-pip dd-result-pip--${r}`}>{OUTCOME_CFG[r].label}</span>)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

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
                            <CompactCard key={cardId} card={card} quantity={quantity} onClick={() => setSelectedCard(card)} />
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
      </div>

      {/* ── Panel de shopping (derecha) ── */}
      <aside className="dd-results-panel">
        <div className="pub-ticket">
          <h3 className="pub-ticket-title">Lo que te falta</h3>
          {collection === null ? (
            <p className="pub-missing-hint">Cargando colección...</p>
          ) : shoppingEntries.length === 0 ? (
            <p className="pub-missing-complete">✓ Tienes todo</p>
          ) : (
            <>
              <ul className="pub-missing-list">
                {shoppingEntries.map(({ card, missing, lineCost }) => (
                  <li key={card.product_id} className="pub-missing-row">
                    <span className="pub-missing-qty">{missing}×</span>
                    <span className="pub-missing-name" title={card.name}>{baseName(card.name)}</span>
                    {lineCost > 0 && <span className="pub-missing-cost">${lineCost.toFixed(2)}</span>}
                  </li>
                ))}
              </ul>
              <div className="pub-ticket-total">
                <span>Total estimado</span>
                <span>${shoppingTotal.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>

        {ownedEntries.length > 0 && (
          <div className="pub-ticket">
            <h3 className="pub-ticket-title">Lo que ya tienes</h3>
            <ul className="pub-missing-list">
              {ownedEntries.map(({ card, have, need }) => (
                <li key={card.product_id} className="pub-missing-row">
                  <span className="pub-missing-qty pub-missing-qty--owned">{have}×</span>
                  <span className="pub-missing-name" title={card.name}>{baseName(card.name)}</span>
                  {have < need && <span className="pub-missing-partial">/{need}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      {selectedCard && <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />}
    </div>
  )
}
