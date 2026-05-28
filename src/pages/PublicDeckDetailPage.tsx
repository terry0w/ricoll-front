import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'

import bodyIcon  from '../assets/icons/Body.png'
import calmIcon  from '../assets/icons/Calm.png'
import chaosIcon from '../assets/icons/Chaos.png'
import furyIcon  from '../assets/icons/Fury.png'
import mindIcon  from '../assets/icons/Mind.png'
import orderIcon from '../assets/icons/Order.png'

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface PublicDeckData {
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
  estimatedCost:    number | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  if (l.includes('champion'))  return 'Champion Unit'
  if (l.includes('unit'))      return 'Unit'
  if (l.includes('spell'))     return 'Spell'
  if (l.includes('gear'))      return 'Gear'
  if (l.includes('signature')) return 'Signature'
  if (l.includes('rune'))      return 'Rune'
  if (l.includes('battle'))    return 'Battlefield'
  return t
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

// ── Sub-components ────────────────────────────────────────────────────────────

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
                    <span style={{ display: 'flex', gap: 4 }}>
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
            {card.ext_description && <p className="modal-description">{card.ext_description}</p>}
            {card.ext_flavor_text && <p className="modal-flavor">"{card.ext_flavor_text}"</p>}
            <div className="modal-footer">
              {foil && <span className="footer-foil">Foil</span>}
              <div className="footer-prices">
                {card.market_price && <span>${card.market_price}</span>}
                {card.low_price    && <span>Low ${card.low_price}</span>}
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PublicDeckDetailPage() {
  const { id }    = useParams<{ id: string }>()
  const { token } = useAuth()

  const [deck,              setDeck]              = useState<PublicDeckData | null>(null)
  const [allCards,          setAllCards]          = useState<Card[]>([])
  const [loading,           setLoading]           = useState(true)
  const [error,             setError]             = useState('')
  const [selectedCard,      setSelectedCard]      = useState<Card | null>(null)
  // collection: "productId:subTypeName" → quantity
  const [collection,        setCollection]        = useState<Map<string, number> | null>(null)
  const [collLoading,       setCollLoading]       = useState(false)
  // versions & events
  const [events,            setEvents]            = useState<DeckEventData[]>([])
  const [versions,          setVersions]          = useState<DeckVersion[] | null>(null)
  const [versionsOpen,      setVersionsOpen]      = useState(false)
  const [versionsLoading,   setVersionsLoading]   = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`/api/decks/public/${id}`).then((r) => r.json()),
      fetch('/api/catalog/cards?limit=5000').then((r) => r.json()),
      fetch(`/api/decks/public/${id}/events`).then((r) => r.json()),
    ])
      .then(([deckData, cards, evResults]) => {
        if (!deckData || deckData.statusCode >= 400) { setError('Deck no encontrado o no es público'); return }
        setDeck(deckData)
        setAllCards(cards)
        if (Array.isArray(evResults)) setEvents(evResults)
      })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!token) return
    setCollLoading(true)
    fetch('/api/collection', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data: { productId: number; subTypeName: string; quantity: number }[]) => {
        const map = new Map<string, number>()
        for (const e of data) map.set(`${e.productId}:${e.subTypeName}`, e.quantity)
        setCollection(map)
      })
      .catch(() => {})
      .finally(() => setCollLoading(false))
  }, [token])

  const cardMap = useMemo(() => {
    const m = new Map<number, Card>()
    allCards.forEach((c) => m.set(c.product_id, c))
    return m
  }, [allCards])

  // Owned per product_id (sum across all sub_type_names)
  const ownedByProduct = useMemo(() => {
    if (!collection) return new Map<number, number>()
    const m = new Map<number, number>()
    for (const [key, qty] of collection) {
      const pid = Number(key.split(':')[0])
      m.set(pid, (m.get(pid) ?? 0) + qty)
    }
    return m
  }, [collection])

  // Missing cards: { card, needed, owned, missing, lineCost }
  const missingCards = useMemo(() => {
    if (!deck || collection === null) return []
    const needed = new Map<number, number>()
    const allEntries = [
      ...deck.mainDeck,
      ...(Array.isArray(deck.runes) ? deck.runes : []),
      ...deck.battlefields.map((id) => ({ cardId: id, quantity: 1 })),
      ...(deck.sideboard ?? []),
    ]
    for (const e of allEntries) {
      needed.set(e.cardId, (needed.get(e.cardId) ?? 0) + e.quantity)
    }
    const result: { card: Card; needed: number; owned: number; missing: number; lineCost: number }[] = []
    for (const [cardId, qty] of needed) {
      const owned   = ownedByProduct.get(cardId) ?? 0
      const missing = Math.max(0, qty - owned)
      if (missing === 0) continue
      const card = cardMap.get(cardId)
      if (!card) continue
      const price = Number(card.market_price ?? card.low_price ?? 0)
      result.push({ card, needed: qty, owned, missing, lineCost: missing * price })
    }
    return result.sort((a, b) => b.lineCost - a.lineCost)
  }, [deck, collection, ownedByProduct, cardMap])

  const missingTotal = useMemo(
    () => missingCards.reduce((s, r) => s + r.lineCost, 0),
    [missingCards],
  )

  // Owned cards from this deck (have at least 1 copy of what's needed)
  const ownedCards = useMemo(() => {
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

  const toggleVersions = async () => {
    if (!versionsOpen && versions === null) {
      setVersionsLoading(true)
      try {
        const data = await fetch(`/api/decks/public/${id}/versions`).then((r) => r.json())
        setVersions(Array.isArray(data) ? data.sort((a: DeckVersion, b: DeckVersion) => b.version - a.version) : [])
      } finally {
        setVersionsLoading(false)
      }
    }
    setVersionsOpen((o) => !o)
  }

  if (loading) return <div className="app"><p className="results-count">Cargando...</p></div>
  if (error || !deck) return <div className="app"><p className="results-count">{error || 'Deck no encontrado'}</p></div>

  const legend   = cardMap.get(deck.legendId)
  const champion = deck.chosenChampionId ? cardMap.get(deck.chosenChampionId) : null

  const runeCards = (Array.isArray(deck.runes) ? deck.runes : []).flatMap(({ cardId, quantity }) => {
    const card = cardMap.get(cardId)
    return card ? Array<Card>(quantity).fill(card) : []
  })

  const runeEntries = (Array.isArray(deck.runes) ? deck.runes : [])
    .map(({ cardId, quantity }) => ({ card: cardMap.get(cardId), quantity }))
    .filter((e): e is { card: Card; quantity: number } => !!e.card)

  const bfCards = deck.battlefields.map((bId) => cardMap.get(bId)).filter(Boolean) as Card[]

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

  const deckTotal = deck.mainDeck.reduce((s, e) => s + e.quantity, 0)

  return (
    <div className="pub-deck-layout">

      {/* ── Contenido del deck ── */}
      <div className="pub-deck-main">

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
          <p className="dd-author">por {deck.authorNickname}</p>
          <div className="dd-badges">
            <span className="badge badge-legal">Legal</span>
            <span className="badge badge-public">Público</span>
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
            {deck.estimatedCost !== null && (
              <span className="deck-cost">~${deck.estimatedCost.toFixed(2)}</span>
            )}
          </div>
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

        {/* Resultados de partidas (solo lectura) */}
        <div className="dd-results-section">
          <div className="dd-results-header">
            <h3 className="dd-results-title">Resultados de partidas</h3>
          </div>
          <div className="dd-results-list">
            {events.length === 0 && <p className="dd-results-empty">Sin eventos registrados.</p>}
            {events.map((ev) => {
              const evRes = eventResult(ev.matches)
              return (
                <div key={ev.id} className={`dd-result-entry dd-result-entry--${evRes}`}>
                  <div className="dd-result-header">
                    <span className="dd-result-event">{ev.gameEvent.name}</span>
                    <span className="dd-result-date">{new Date(ev.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
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

      {/* ── Panel lateral ── */}
      <aside className="pub-missing-panel">

        {/* Ticket: cartas que faltan */}
        <div className="pub-ticket">
          <h3 className="pub-ticket-title">Lo que te falta</h3>

          {!token ? (
            <p className="pub-missing-hint">
              <Link to="/login" className="pub-missing-login">Inicia sesión</Link> para ver qué cartas te faltan.
            </p>
          ) : collLoading ? (
            <p className="pub-missing-hint">Cargando colección...</p>
          ) : missingCards.length === 0 ? (
            <p className="pub-missing-complete">✓ Tienes todo</p>
          ) : (
            <>
              <ul className="pub-missing-list">
                {missingCards.map(({ card, missing, lineCost }) => (
                  <li key={card.product_id} className="pub-missing-row">
                    <span className="pub-missing-qty">{missing}×</span>
                    <span className="pub-missing-name" title={card.name}>{baseName(card.name)}</span>
                    {lineCost > 0 && <span className="pub-missing-cost">${lineCost.toFixed(2)}</span>}
                  </li>
                ))}
              </ul>
              <div className="pub-ticket-total">
                <span>Total estimado</span>
                <span>${missingTotal.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>

        {/* Ticket: cartas que ya tienes */}
        {token && !collLoading && ownedCards.length > 0 && (
          <div className="pub-ticket">
            <h3 className="pub-ticket-title">Lo que ya tienes</h3>
            <ul className="pub-missing-list">
              {ownedCards.map(({ card, have, need }) => (
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
