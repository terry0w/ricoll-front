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
  product_id:    number
  name:          string
  image_url:     string
  ext_card_type: string | null
  ext_domain:    string | null
  ext_rarity:    string | null
  sub_type_name: string | null
  set_name:      string
}

interface DeckEntry { card: Card; qty: number }

type Tab = 'legend' | 'deck' | 'battlefields'

interface CtxMenu {
  x:      number
  y:      number
  card:   Card
  source: 'browser' | 'deck-entry' | 'side-entry' | 'bf-entry'
}

const DOMAIN_ICONS: Record<string, string> = {
  fury: furyIcon, calm: calmIcon, mind: mindIcon,
  body: bodyIcon, chaos: chaosIcon, order: orderIcon,
}

const TYPE_ORDER = ['Champion Unit', 'Unit', 'Spell', 'Gear', 'Signature']

const hqUrl    = (url: string) => url.replace('_200w.jpg', '_400w.jpg')
const baseName = (name: string) => name.replace(/\s*\(.*\)\s*$/, '').trim()

const cardType = (t: string | null) => {
  if (!t) return ''
  const l = t.toLowerCase()
  if (l.includes('token'))       return 'Token'
  if (l.includes('rune'))        return 'Rune'
  if (l.includes('signature'))   return 'Signature'
  if (l.includes('champion'))    return 'Champion Unit'
  if (l.includes('unit'))        return 'Unit'
  if (l.includes('gear'))        return 'Gear'
  if (l.includes('spell'))       return 'Spell'
  if (l.includes('battlefield')) return 'Battlefield'
  if (l.includes('legend'))      return 'Legend'
  return ''
}

const legendDomains = (legend: Card | null): string[] =>
  legend?.ext_domain?.split(';').map((d) => d.trim().toLowerCase()) ?? []

const championName = (legend: Card | null): string =>
  legend ? baseName(legend.name).split(' - ')[0].trim() : ''

const DECK_TYPES = new Set(['Unit', 'Champion Unit', 'Spell', 'Gear', 'Signature'])

const groupCount = (map: Map<number, DeckEntry>, name: string): number => {
  let total = 0
  map.forEach(({ card, qty }) => { if (baseName(card.name) === baseName(name)) total += qty })
  return total
}

const mapTotal = (map: Map<number, DeckEntry>): number => {
  let t = 0; map.forEach(({ qty }) => { t += qty }); return t
}

const groupByType = (map: Map<number, DeckEntry>, chName = ''): Map<string, DeckEntry[]> => {
  const groups = new Map<string, DeckEntry[]>()
  map.forEach((entry) => {
    let t = cardType(entry.card.ext_card_type) || 'Otro'
    if (t === 'Champion Unit' && !(chName && baseName(entry.card.name).toLowerCase().startsWith(chName.toLowerCase()))) {
      t = 'Unit'
    }
    if (!groups.has(t)) groups.set(t, [])
    groups.get(t)!.push(entry)
  })
  const sorted = new Map<string, DeckEntry[]>()
  TYPE_ORDER.forEach((t) => { if (groups.has(t)) sorted.set(t, groups.get(t)!) })
  groups.forEach((v, k) => { if (!sorted.has(k)) sorted.set(k, v) })
  return sorted
}

interface RawDeck {
  id:               string
  name:             string
  public:           boolean
  legendId:         number
  chosenChampionId: number | null
  mainDeck:         Array<{ cardId: number; quantity: number }>
  runes:            Array<{ cardId: number; quantity: number }>
  battlefields:     number[]
  sideboard:        Array<{ cardId: number; quantity: number }>
}

export default function DeckBuilderPage() {
  const { token }   = useAuth()
  const navigate    = useNavigate()
  const { id }      = useParams<{ id?: string }>()

  const [allCards,    setAllCards]    = useState<Card[]>([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState<Tab>('legend')
  const [sideMode,    setSideMode]    = useState(false)
  const [addQty,      setAddQty]      = useState<1|2|3>(1)
  const [ctxMenu,     setCtxMenu]     = useState<CtxMenu | null>(null)
  const [dragCard,    setDragCard]    = useState<Card | null>(null)
  const [dragSource,  setDragSource]  = useState<'browser' | 'deck' | 'side' | null>(null)
  const [isDragOver,  setIsDragOver]  = useState(false)

  const [legend,    setLegend]    = useState<Card | null>(null)
  const [champion,  setChampion]  = useState<Card | null>(null)
  const [deck,      setDeck]      = useState<Map<number, DeckEntry>>(new Map())
  const [runeMap,   setRuneMap]   = useState<Map<number, DeckEntry>>(new Map())
  const [bfs,       setBfs]       = useState<number[]>([])
  const [sideboard, setSideboard] = useState<Map<number, DeckEntry>>(new Map())
  const [deckName,     setDeckName]     = useState('')
  const [isPublic,     setIsPublic]     = useState(false)
  const [versionNote,  setVersionNote]  = useState('')
  const [search,    setSearch]    = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [viewCard,    setViewCard]    = useState<Card | null>(null)
  const [editDeckRaw, setEditDeckRaw] = useState<RawDeck | null>(null)

  useEffect(() => {
    fetch('/api/catalog/cards?limit=5000')
      .then((r) => r.json())
      .then((data) => { setAllCards(data); setLoading(false) })
  }, [])

  // Carga el deck existente cuando se edita
  useEffect(() => {
    if (!id || !token) return
    fetch(`/api/decks/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setEditDeckRaw)
  }, [id, token])

  // Aplica el deck raw una vez que las cartas están cargadas
  useEffect(() => {
    if (!editDeckRaw || allCards.length === 0) return
    const cMap = new Map<number, Card>(allCards.map((c) => [c.product_id, c]))
    const legendCard = cMap.get(editDeckRaw.legendId)
    if (!legendCard) return

    setDeckName(editDeckRaw.name)
    setIsPublic(editDeckRaw.public)
    setLegend(legendCard)

    if (editDeckRaw.chosenChampionId) {
      const ch = cMap.get(editDeckRaw.chosenChampionId)
      if (ch) setChampion(ch)
    }

    const deckMap = new Map<number, DeckEntry>()
    editDeckRaw.mainDeck.forEach(({ cardId, quantity }) => {
      const card = cMap.get(cardId)
      if (card) deckMap.set(cardId, { card, qty: quantity })
    })
    setDeck(deckMap)

    setBfs(editDeckRaw.battlefields)

    const runeMapEdit = new Map<number, DeckEntry>()
    ;(Array.isArray(editDeckRaw.runes) ? editDeckRaw.runes : []).forEach(({ cardId, quantity }) => {
      const card = cMap.get(cardId)
      if (card) runeMapEdit.set(cardId, { card, qty: quantity })
    })
    setRuneMap(runeMapEdit)

    const sideMap = new Map<number, DeckEntry>()
    editDeckRaw.sideboard.forEach(({ cardId, quantity }) => {
      const card = cMap.get(cardId)
      if (card) sideMap.set(cardId, { card, qty: quantity })
    })
    setSideboard(sideMap)
    setTab('deck')
  }, [editDeckRaw, allCards])

  useEffect(() => { setSearch('') }, [tab])

  // Cierra el menú contextual al hacer clic fuera o pulsar Escape
  useEffect(() => {
    if (!ctxMenu) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return
      setCtxMenu(null)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown',   close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown',   close)
    }
  }, [ctxMenu])

  const domains = legendDomains(legend)
  const chName  = championName(legend)

  // ── Pools ─────────────────────────────────────────────────────────────────────

  const legends = useMemo(() =>
    allCards.filter((c) => cardType(c.ext_card_type) === 'Legend'),
  [allCards])

  const deckPool = useMemo(() => {
    if (!legend) return []
    return allCards.filter((c) => {
      const type = cardType(c.ext_card_type)
      if (!DECK_TYPES.has(type)) return false
      if (type === 'Signature' && !baseName(c.name).toLowerCase().startsWith(chName.toLowerCase())) return false
      if (!c.ext_domain) return false
      const cDomains = c.ext_domain.split(';').map((d) => d.trim().toLowerCase())
      return cDomains.every((d) => domains.includes(d))
    })
  }, [allCards, legend, domains, chName])

  const battlefieldPool = useMemo(() =>
    allCards.filter((c) => cardType(c.ext_card_type) === 'Battlefield'),
  [allCards])

  const runePool = useMemo(() => {
    if (!legend) return []
    return allCards.filter((c) => {
      if (cardType(c.ext_card_type) !== 'Rune') return false
      if (!c.ext_domain) return false
      const cDomains = c.ext_domain.split(';').map((d) => d.trim().toLowerCase())
      return cDomains.every((d) => domains.includes(d))
    })
  }, [allCards, legend, domains])

  // ── Totales y agrupaciones ────────────────────────────────────────────────────

  const deckTotal  = useMemo(() => mapTotal(deck),      [deck])
  const sideTotal  = useMemo(() => mapTotal(sideboard), [sideboard])
  const runeTotal  = useMemo(() => mapTotal(runeMap),   [runeMap])

  const deckByType = useMemo(() => groupByType(deck,      chName), [deck,      chName])
  const sideByType = useMemo(() => groupByType(sideboard, chName), [sideboard, chName])

  const bfCards = useMemo(() =>
    bfs.map((id) => battlefieldPool.find((c) => c.product_id === id)).filter(Boolean) as Card[],
  [bfs, battlefieldPool])

  const isLegal = useMemo(() => {
    if (deckTotal !== 40) return false
    if (Array.from(deck.values()).some((e) => e.qty > 3)) return false
    if (bfs.length !== 3 || new Set(bfs).size !== 3) return false
    if (runeTotal !== 12) return false
    return true
  }, [deckTotal, deck, bfs, runeTotal])

  // ── Añadir cartas con límites ─────────────────────────────────────────────────

  const addCard = (card: Card, qty: number, side = false) => {
    const map      = side ? sideboard : deck
    const setMap   = side ? (m: Map<number, DeckEntry>) => setSideboard(m) : (m: Map<number, DeckEntry>) => setDeck(m)
    const curTotal = side ? sideTotal : deckTotal
    const maxTotal = side ? 8 : 40
    let next  = new Map(map)
    let total = curTotal
    let added = 0
    while (added < qty) {
      const cur = next.get(card.product_id)?.qty ?? 0
      const grp = groupCount(next, card.name)
      if (cur >= 3 || grp >= 3 || total >= maxTotal) break
      next.set(card.product_id, { card, qty: cur + 1 })
      total++
      added++
    }
    if (added > 0) setMap(next)
  }

  // Cuántas copias más se pueden añadir (0-3)
  const getCanAdd = (card: Card, side = false): number => {
    const map      = side ? sideboard : deck
    const curTotal = side ? sideTotal : deckTotal
    const maxTotal = side ? 8 : 40
    const cur = map.get(card.product_id)?.qty ?? 0
    const grp = groupCount(map, card.name)
    return Math.max(0, Math.min(3 - cur, 3 - grp, maxTotal - curTotal))
  }

  const setQty = (
    map: Map<number, DeckEntry>,
    setMap: (m: Map<number, DeckEntry>) => void,
    card: Card,
    delta: number,
    maxTotal: number,
    curTotal: number,
  ) => {
    const next   = new Map(map)
    const cur    = next.get(card.product_id)?.qty ?? 0
    const group  = groupCount(map, card.name) - cur
    const newQty = cur + delta
    if (newQty <= 0)                       { next.delete(card.product_id); setMap(next); return }
    if (newQty > 3 || group + newQty > 3)  return
    if (delta > 0 && curTotal >= maxTotal) return
    next.set(card.product_id, { card, qty: newQty })
    setMap(next)
  }

  const removeFromMap = (map: Map<number, DeckEntry>, setMap: (m: Map<number, DeckEntry>) => void, card: Card) => {
    const next = new Map(map)
    next.delete(card.product_id)
    setMap(next)
  }

  const toggleBf = (id: number) =>
    setBfs((prev) => prev.includes(id) ? prev.filter((b) => b !== id) : prev.length < 3 ? [...prev, id] : prev)

  const adjustRuneCard = (card: Card, delta: number) => {
    setRuneMap((prev) => {
      const next   = new Map(prev)
      const cur    = next.get(card.product_id)?.qty ?? 0
      const newQty = cur + delta
      if (newQty <= 0) { next.delete(card.product_id); return next }
      if (delta > 0 && runeTotal >= 12) return prev
      next.set(card.product_id, { card, qty: newQty })
      return next
    })
  }

  const selectLegend = (card: Card) => {
    setLegend(card)
    setChampion(null)
    setDeck(new Map())
    setSideboard(new Map())
    setBfs([])
    setRuneMap(new Map())
    setTab('deck')
  }

  const clearLegend = () => {
    setLegend(null); setChampion(null); setDeck(new Map()); setSideboard(new Map()); setBfs([]); setRuneMap(new Map())
    setTab('legend')
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!legend || !deckName.trim()) { setError('Elige una leyenda y ponle nombre al deck'); return }
    if (!champion) { setError('Debes elegir un chosen champion (clic derecho sobre un Champion Unit en el mazo)'); return }
    setSaving(true); setError('')
    try {
      const norm = (entries: { cardId: number; quantity: number }[]) =>
        [...entries].sort((a, b) => a.cardId - b.cardId)

      const mainDeckOut  = Array.from(deck.values()).map(({ card, qty }) => ({ cardId: card.product_id, quantity: qty }))
      const runesOut     = Array.from(runeMap.values()).map(({ card, qty }) => ({ cardId: card.product_id, quantity: qty }))
      const sideboardOut = Array.from(sideboard.values()).map(({ card, qty }) => ({ cardId: card.product_id, quantity: qty }))

      const body = {
        name:             deckName.trim(),
        public:           isPublic,
        legendId:         legend.product_id,
        chosenChampionId: champion?.product_id ?? null,
        mainDeck:         mainDeckOut,
        runes:            runesOut,
        battlefields:     bfs,
        sideboard:        sideboardOut,
      }

      let skipVersion = false
      if (id && editDeckRaw) {
        const contentChanged =
          JSON.stringify(norm(mainDeckOut))  !== JSON.stringify(norm(editDeckRaw.mainDeck)) ||
          JSON.stringify(norm(runesOut))     !== JSON.stringify(norm(Array.isArray(editDeckRaw.runes) ? editDeckRaw.runes : [])) ||
          JSON.stringify([...bfs].sort())    !== JSON.stringify([...editDeckRaw.battlefields].sort()) ||
          JSON.stringify(norm(sideboardOut)) !== JSON.stringify(norm(editDeckRaw.sideboard)) ||
          legend.product_id                  !== editDeckRaw.legendId ||
          (champion?.product_id ?? null)     !== editDeckRaw.chosenChampionId
        skipVersion = !contentChanged
      }

      const params = new URLSearchParams()
      if (skipVersion) params.set('skipVersion', 'true')
      if (!skipVersion && versionNote.trim()) params.set('note', versionNote.trim())
      const qs = params.toString() ? `?${params.toString()}` : ''
      const url = id ? `/api/decks/${id}${qs}` : '/api/decks'
      const res = await fetch(url, {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json(); setError(d.message ?? 'Error al guardar'); return }
      navigate('/decks')
    } catch { setError('Error de conexión') }
    finally  { setSaving(false) }
  }

  // ── Filtrado y pool activo ────────────────────────────────────────────────────

  const activePool =
    tab === 'legend'      ? legends
    : tab === 'deck'      ? deckPool
    :                       battlefieldPool

  const filtered = activePool.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))

  // ── Drag & drop ───────────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, card: Card) => {
    e.dataTransfer.effectAllowed = 'copy'
    setDragCard(card)
    setDragSource('browser')
  }

  const handleDeckDragStart = (e: React.DragEvent, card: Card, source: 'deck' | 'side') => {
    e.dataTransfer.effectAllowed = 'move'
    setDragCard(card)
    setDragSource(source)
  }

  const handleDragEnd = () => { setDragCard(null); setDragSource(null) }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (dragSource === 'browser' && dragCard && tab === 'deck') addCard(dragCard, addQty, sideMode)
    setDragCard(null)
    setDragSource(null)
  }

  const handleLeftDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!dragCard) return
    if (dragSource === 'deck') setQty(deck, setDeck, dragCard, -1, 40, deckTotal)
    else if (dragSource === 'side') setQty(sideboard, setSideboard, dragCard, -1, 8, sideTotal)
    setDragCard(null)
    setDragSource(null)
  }

  // ── Menú contextual ───────────────────────────────────────────────────────────

  const openCtxMenu = (e: React.MouseEvent, card: Card, source: CtxMenu['source']) => {
    e.preventDefault()
    const x = Math.min(e.clientX, window.innerWidth  - 210)
    const y = Math.min(e.clientY, window.innerHeight - 200)
    setCtxMenu({ x, y, card, source })
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="deck-builder-page">

      {/* ══════════════════ Panel izquierdo: buscador ══════════════════ */}
      <div
        className="db-left"
        onDragOver={(e) => { if (dragSource === 'deck' || dragSource === 'side') e.preventDefault() }}
        onDrop={handleLeftDrop}
      >
        <div className="db-left-header">
          <input
            className="db-search"
            type="text"
            placeholder="Buscar carta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="db-tabs">
            <button className={`db-tab ${tab === 'legend' ? 'active' : ''}`}       onClick={() => setTab('legend')}>Legend</button>
            <button className={`db-tab ${tab === 'deck' ? 'active' : ''}`}         onClick={() => legend && setTab('deck')} disabled={!legend}>Mazo</button>
            <button
              className={`db-tab ${tab === 'battlefields' ? 'active' : ''}`}
              onClick={() => {
                if (legend && !champion) { setError('Elige un Chosen Champion antes de elegir Battlefields'); return }
                setError('')
                setTab('battlefields')
              }}
            >Battlefields</button>
          </div>

          {tab === 'deck' && legend && (
            <div className="db-browser-controls">
              <div className="db-target-toggle">
                <button className={`db-target-btn ${!sideMode ? 'active' : ''}`} onClick={() => setSideMode(false)}>
                  Mazo ({deckTotal}/40)
                </button>
                <button className={`db-target-btn ${sideMode ? 'active' : ''}`} onClick={() => setSideMode(true)}>
                  Sideboard ({sideTotal}/8)
                </button>
              </div>
              <div className="db-qty-toggle">
                <span className="db-qty-label">Añadir:</span>
                {([1, 2, 3] as (1|2|3)[]).map((n) => (
                  <button
                    key={n}
                    className={`db-qty-opt ${addQty === n ? 'active' : ''}`}
                    onClick={() => setAddQty(n)}
                  >{n}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="db-card-grid">
          {loading && <p className="db-hint">Cargando cartas...</p>}
          {!loading && !legend && tab === 'deck' && <p className="db-hint">Selecciona primero una leyenda</p>}

          {filtered.map((c) => {
            const isSelected =
              tab === 'legend'      ? legend?.product_id === c.product_id
              : tab === 'battlefields' ? bfs.includes(c.product_id)
              : false
            const qty    = (tab === 'deck') ? (sideMode ? sideboard : deck).get(c.product_id)?.qty ?? 0 : 0
            const dimmed = tab === 'battlefields' && !bfs.includes(c.product_id) && bfs.length >= 3

            const handleClick = () => {
              if (tab === 'legend')      { selectLegend(c); return }
              if (tab === 'battlefields') { toggleBf(c.product_id); return }
              if (tab === 'deck')        { addCard(c, addQty, sideMode) }
            }

            return (
              <div
                key={c.product_id}
                className={`db-card ${isSelected || qty > 0 ? 'selected' : ''} ${dimmed ? 'dimmed' : ''} ${cardType(c.ext_card_type) === 'Battlefield' && c.set_name !== 'origins' ? 'bf-landscape' : ''}`}
                draggable={tab === 'deck'}
                onClick={handleClick}
                onContextMenu={(e) => tab === 'deck' && openCtxMenu(e, c, 'browser')}
                onDragStart={(e) => handleDragStart(e, c)}
                onDragEnd={handleDragEnd}
              >
                {c.image_url && <img src={hqUrl(c.image_url)} alt={c.name} draggable={false} />}
                {qty > 0 && <span className="db-qty-badge">×{qty}</span>}
                <p className="db-card-name">{c.name}</p>
                {c.ext_domain && tab === 'legend' && (
                  <div className="db-card-domains">
                    {c.ext_domain.split(';').map((d) => (
                      <img key={d} src={DOMAIN_ICONS[d.trim().toLowerCase()]} alt={d} className="domain-pip" />
                    ))}
                  </div>
                )}
              </div>
            )
          })}

        </div>
      </div>

      {/* ══════════════════ Panel derecho: deck ══════════════════ */}
      <div className="db-right">
        <div className="db-right-header">
          <input
            className="db-deck-name"
            type="text"
            placeholder="Nombre del deck..."
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
          />
          <div className="db-right-actions">
            <label className="db-public-label">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              Público
            </label>
            <input
              className="db-note-input"
              type="text"
              placeholder="Nota de versión (opcional)..."
              value={versionNote}
              onChange={(e) => setVersionNote(e.target.value)}
              maxLength={200}
            />
            {error && <span className="db-error">{error}</span>}
            <button className="btn-accent db-save-btn" onClick={handleSubmit} disabled={saving || !legend || !champion}>
              {saving ? 'Guardando...' : id ? 'Guardar cambios' : 'Guardar deck'}
            </button>
          </div>
        </div>

        <div
          className={`db-right-body ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >

          {/* Legend */}
          <div className="db-section">
            <div className="db-section-title">
              Legend
              {!legend && <span className="db-section-hint"> — elige desde el panel izquierdo</span>}
            </div>
            {legend && (
              <div className="db-slot">
                {legend.image_url && <img src={hqUrl(legend.image_url)} alt={legend.name} className="db-slot-img" />}
                <div className="db-slot-info">
                  <span className="db-slot-name">{legend.name}</span>
                  {legend.ext_domain && (
                    <div className="db-card-domains" style={{ marginTop: 4 }}>
                      {legend.ext_domain.split(';').map((d) => (
                        <img key={d} src={DOMAIN_ICONS[d.trim().toLowerCase()]} alt={d} className="domain-pip" />
                      ))}
                    </div>
                  )}
                </div>
                <button className="db-slot-remove" onClick={clearLegend} title="Cambiar leyenda">×</button>
              </div>
            )}
          </div>

          {/* Champion */}
          {legend && (
            <div className="db-section">
              <div className="db-section-title">Champion</div>
              {champion ? (
                <div className="db-slot">
                  {champion.image_url && <img src={hqUrl(champion.image_url)} alt={champion.name} className="db-slot-img" />}
                  <div className="db-slot-info">
                    <span className="db-slot-name">{champion.name}</span>
                  </div>
                  <button className="db-slot-remove" onClick={() => setChampion(null)} title="Quitar champion">×</button>
                </div>
              ) : (
                <p className="db-empty">Haz clic derecho sobre un Champion Unit en el mazo para asignarlo</p>
              )}
            </div>
          )}

          {/* Mazo principal */}
          <div className="db-section">
            <div className="db-section-title">
              Mazo
              <span className={`db-count ${deckTotal === 40 ? 'ok' : ''}`}>{deckTotal}/40</span>
              {isLegal && <span className="badge badge-legal">Legal</span>}
            </div>
            {deck.size === 0
              ? <p className="db-empty">Arrastra cartas aquí o haz clic en ellas desde el panel izquierdo</p>
              : Array.from(deckByType.entries()).map(([type, entries]) => (
                <div key={type} className="db-type-group">
                  <div className="db-type-label">{type} ({entries.reduce((s, e) => s + e.qty, 0)})</div>
                  <div className="db-deck-grid">
                    {entries.map(({ card, qty }) => (
                      <div
                        key={card.product_id}
                        className="db-deck-card"
                        draggable
                        onDragStart={(e) => handleDeckDragStart(e, card, 'deck')}
                        onDragEnd={handleDragEnd}
                        onContextMenu={(e) => openCtxMenu(e, card, 'deck-entry')}
                        onClick={() => setViewCard(card)}
                      >
                        {card.image_url
                          ? <img src={hqUrl(card.image_url)} alt={card.name} draggable={false} />
                          : <div className="db-deck-noimg">{baseName(card.name)}</div>
                        }
                        <span className="db-deck-qty">×{qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            }
          </div>

          {/* Runas */}
          {legend && (
            <div className="db-section">
              <div className="db-section-title">
                Runas
                <span className={`db-count ${runeTotal === 12 ? 'ok' : ''}`}>{runeTotal}/12</span>
              </div>
              {runePool.length === 0
                ? <p className="db-empty">No hay cartas de runa disponibles</p>
                : (
                  <div className="db-rune-picker">
                    {runePool.map((card) => {
                      const qty = runeMap.get(card.product_id)?.qty ?? 0
                      return (
                        <div key={card.product_id} className={`db-rune-item ${qty > 0 ? 'selected' : ''}`}>
                          {card.image_url
                            ? <img src={hqUrl(card.image_url)} alt={card.name} className="db-rune-img" onClick={() => setViewCard(card)} />
                            : <div className="db-rune-img db-rune-noimg" />
                          }
                          <div className="db-entry-qty db-rune-qty">
                            <button onClick={() => adjustRuneCard(card, -1)} disabled={qty <= 0}>−</button>
                            <span>{qty}</span>
                            <button onClick={() => adjustRuneCard(card, +1)} disabled={runeTotal >= 12}>+</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              }
            </div>
          )}

          {/* Battlefields */}
          <div className="db-section">
            <div className="db-section-title">
              Battlefields
              <span className={`db-count ${bfs.length === 3 ? 'ok' : ''}`}>{bfs.length}/3</span>
            </div>
            {bfCards.length === 0
              ? <p className="db-empty">Elige battlefields desde el panel izquierdo</p>
              : bfCards.map((c) => (
                <div key={c.product_id} className="db-entry" onContextMenu={(e) => openCtxMenu(e, c, 'bf-entry')}>
                  {c.image_url && (
                    <img src={hqUrl(c.image_url)} alt={c.name} className="db-entry-thumb" onClick={() => setViewCard(c)} />
                  )}
                  <span className="db-entry-name" onClick={() => setViewCard(c)}>{c.name}</span>
                  <button className="db-entry-remove" onClick={() => toggleBf(c.product_id)}>×</button>
                </div>
              ))
            }
          </div>

          {/* Sideboard */}
          {legend && (
            <div className="db-section">
              <div className="db-section-title">
                Sideboard
                <span className="db-count">{sideTotal}/8</span>
              </div>
              {sideboard.size === 0
                ? <p className="db-empty">Activa el modo sideboard en el panel izquierdo para añadir cartas</p>
                : Array.from(sideByType.entries()).map(([type, entries]) => (
                  <div key={type} className="db-type-group">
                    <div className="db-type-label">{type} ({entries.reduce((s, e) => s + e.qty, 0)})</div>
                    <div className="db-deck-grid">
                      {entries.map(({ card, qty }) => (
                        <div
                          key={card.product_id}
                          className="db-deck-card"
                          draggable
                          onDragStart={(e) => handleDeckDragStart(e, card, 'side')}
                          onDragEnd={handleDragEnd}
                          onContextMenu={(e) => openCtxMenu(e, card, 'side-entry')}
                          onClick={() => setViewCard(card)}
                        >
                          {card.image_url
                            ? <img src={hqUrl(card.image_url)} alt={card.name} draggable={false} />
                            : <div className="db-deck-noimg">{baseName(card.name)}</div>
                          }
                          <span className="db-deck-qty">×{qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              }
            </div>
          )}

        </div>
      </div>

      {/* ══════════════════ Menú contextual ══════════════════ */}
      {ctxMenu && (
        <div
          className="ctx-menu"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Browser: añadir y restar */}
          {ctxMenu.source === 'browser' && (() => {
            const canAdd = getCanAdd(ctxMenu.card, sideMode)
            const dest   = sideMode ? 'sideboard' : 'mazo'
            const qty    = (sideMode ? sideboard : deck).get(ctxMenu.card.product_id)?.qty ?? 0
            return (
              <>
                {([1, 2, 3] as (1|2|3)[]).map((n) => (
                  <button
                    key={n}
                    className="ctx-item"
                    disabled={canAdd < n}
                    onClick={() => { addCard(ctxMenu.card, n, sideMode); setCtxMenu(null) }}
                  >
                    Añadir ×{n} al {dest}
                  </button>
                ))}
                {qty > 0 && (
                  <button
                    className="ctx-item"
                    onClick={() => setQty(
                      sideMode ? sideboard : deck,
                      sideMode ? setSideboard : setDeck,
                      ctxMenu.card, -1,
                      sideMode ? 8 : 40,
                      sideMode ? sideTotal : deckTotal,
                    )}
                  >
                    Restar ×1
                  </button>
                )}
              </>
            )
          })()}

          {/* Deck entry: restar / eliminar */}
          {ctxMenu.source === 'deck-entry' && (
            <>
              <button
                className="ctx-item"
                onClick={() => setQty(deck, setDeck, ctxMenu.card, -1, 40, deckTotal)}
              >
                Restar ×1
              </button>
              <button
                className="ctx-item ctx-item--danger"
                onClick={() => { removeFromMap(deck, setDeck, ctxMenu.card); setCtxMenu(null) }}
              >
                Eliminar del mazo
              </button>
            </>
          )}

          {/* Sideboard entry: restar / eliminar */}
          {ctxMenu.source === 'side-entry' && (
            <>
              <button
                className="ctx-item"
                onClick={() => setQty(sideboard, setSideboard, ctxMenu.card, -1, 8, sideTotal)}
              >
                Restar ×1
              </button>
              <button
                className="ctx-item ctx-item--danger"
                onClick={() => { removeFromMap(sideboard, setSideboard, ctxMenu.card); setCtxMenu(null) }}
              >
                Eliminar del sideboard
              </button>
            </>
          )}

          {/* Opción de chosen champion */}
          {cardType(ctxMenu.card.ext_card_type) === 'Champion Unit' &&
           legend && baseName(ctxMenu.card.name).toLowerCase().startsWith(chName.toLowerCase()) && (
            <>
              <div className="ctx-sep" />
              <button
                className="ctx-item ctx-item--accent"
                onClick={() => { setChampion(ctxMenu.card); setCtxMenu(null) }}
              >
                Establecer como chosen champion
              </button>
            </>
          )}

          {/* Ver carta — siempre al final */}
          <div className="ctx-sep" />
          <button
            className="ctx-item"
            onClick={() => { setViewCard(ctxMenu.card); setCtxMenu(null) }}
          >
            Ver carta
          </button>
        </div>
      )}

      {/* ══════════════════ Vista de carta ══════════════════ */}
      {viewCard && (
        <div className="card-view-backdrop" onClick={() => setViewCard(null)}>
          <div className="card-view" onClick={(e) => e.stopPropagation()}>
            {viewCard.image_url && (
              <img src={hqUrl(viewCard.image_url)} alt={viewCard.name} />
            )}
            <p className="card-view-name">{viewCard.name}</p>
            <button className="card-view-close" onClick={() => setViewCard(null)}>×</button>
          </div>
        </div>
      )}

    </div>
  )
}
