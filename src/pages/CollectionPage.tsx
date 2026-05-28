import { useEffect, useMemo, useRef, useState } from 'react'

import furyIcon     from '../assets/icons/Fury.png'
import calmIcon     from '../assets/icons/Calm.png'
import mindIcon     from '../assets/icons/Mind.png'
import bodyIcon     from '../assets/icons/Body.png'
import chaosIcon    from '../assets/icons/Chaos.png'
import orderIcon    from '../assets/icons/Order.png'

import commonIcon   from '../assets/icons/Common.png'
import uncommonIcon from '../assets/icons/Uncommon.png'
import rareIcon     from '../assets/icons/Rare.png'
import epicIcon     from '../assets/icons/Epic.png'
import showcaseIcon from '../assets/icons/Showcase.png'

import { useAuth } from '../contexts/AuthContext'

// ── Types ────────────────────────────────────────────────────────────────────

interface Card {
  product_id:      number
  name:            string
  set_name:        string
  image_url:       string
  market_price:    number | null
  low_price:       number | null
  sub_type_name:   string | null
  ext_rarity:      string | null
  ext_number:      string | null
  ext_card_type:   string | null
  ext_domain:      string | null
  ext_energy_cost: number | null
  ext_power_cost:  number | null
  ext_might:       number | null
  ext_tag:         string | null
  ext_description: string | null
  ext_flavor_text: string | null
}

interface Variant {
  productId:    number
  subTypeName:  string
  name:         string | null
  imageUrl:     string | null
  extRarity:    string | null
  lowPrice:     number | null
  marketPrice:  number | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SETS = [
  { value: 'origins',                 label: 'Origins'         },
  { value: 'origins_proving_grounds', label: 'Proving Grounds' },
  { value: 'spiritforged',            label: 'Spiritforged'    },
  { value: 'unleashed',               label: 'Unleashed'       },
]

const RARITIES = [
  { value: 'Common',          label: 'Common',          icon: commonIcon   },
  { value: 'Uncommon',        label: 'Uncommon',        icon: uncommonIcon },
  { value: 'Rare',            label: 'Rare',            icon: rareIcon     },
  { value: 'Epic',            label: 'Epic',            icon: epicIcon     },
  { value: 'Showcase',        label: 'Showcase',        icon: showcaseIcon },
  { value: 'Signed Showcase', label: 'Signed Showcase', icon: showcaseIcon },
]

const CARD_TYPES = ['Unit', 'Spell', 'Gear', 'Battlefield', 'Legend', 'Signature', 'Token', 'Rune']
const DOMAINS    = ['fury', 'calm', 'mind', 'body', 'chaos', 'order']

const DOMAIN_COLORS: Record<string, string> = {
  fury:  '#e8604c', calm:  '#2980b9', mind:  '#8e44ad',
  body:  '#27ae60', chaos: '#4a3060', order: '#e6c020',
}

const DOMAIN_ICONS: Record<string, string> = {
  fury: furyIcon, calm: calmIcon, mind: mindIcon,
  body: bodyIcon, chaos: chaosIcon, order: orderIcon,
}

const EMPTY_FILTERS = {
  name: '', sets: [] as string[], rarities: [] as string[],
  domains: [] as string[], types: [] as string[],
}

const PAGE_SIZE = 50
const hqUrl = (url: string) => url.replace('_200w.jpg', '_400w.jpg')
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// Collection entries are keyed by "productId:subTypeName"
const collKey = (productId: number, subTypeName: string) => `${productId}:${subTypeName}`

const getCardDomains = (extDomain: string | null): string[] => {
  if (!extDomain) return []
  return extDomain.split(';').map((d) => d.trim().toLowerCase())
}

const normalizeCardType = (extCardType: string | null): string => {
  if (!extCardType) return ''
  const lower = extCardType.toLowerCase()
  if (lower.includes('token'))       return 'Token'
  if (lower.includes('rune'))        return 'Rune'
  if (lower.includes('signature'))   return 'Signature'
  if (lower.includes('unit'))        return 'Unit'
  if (lower.includes('gear'))        return 'Gear'
  if (lower.includes('spell'))       return 'Spell'
  if (lower.includes('battlefield')) return 'Battlefield'
  if (lower.includes('legend'))      return 'Legend'
  return ''
}

// ── FilterDropdown ────────────────────────────────────────────────────────────

function FilterDropdown({
  label, options, selected, onToggle,
}: {
  label: string
  options: { value: string; label: string; icon?: string }[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="filter-dropdown" ref={ref}>
      <button
        className={`filter-dropdown-btn ${selected.length > 0 ? 'active' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        {label}{selected.length > 0 ? ` (${selected.length})` : ''}
        <span className="dropdown-arrow">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="filter-dropdown-menu">
          {options.map((opt) => (
            <label key={opt.value} className="filter-check-item">
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => onToggle(opt.value)}
              />
              {opt.icon && (
                <img src={opt.icon} alt={opt.label} style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
              )}
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ── CollectionPage ────────────────────────────────────────────────────────────

export default function CollectionPage() {
  const { token } = useAuth()

  const [allCards,   setAllCards]   = useState<Card[]>([])
  // key: "productId:subTypeName" → quantity
  const [collection, setCollection] = useState<Map<string, number>>(new Map())
  const [loading,    setLoading]    = useState(true)
  const [filters,    setFilters]    = useState(EMPTY_FILTERS)
  const [page,       setPage]       = useState(0)

  // Panel
  const [panelCard,    setPanelCard]    = useState<Card | null>(null)
  const [panelMode,    setPanelMode]    = useState<'add' | 'subtract' | null>(null)
  const [panelVariants,setPanelVariants]= useState<Variant[]>([])
  const [panelLoading, setPanelLoading] = useState(false)

  // Add
  const [addSubType, setAddSubType] = useState<string | null>(null)
  const [addQty,     setAddQty]     = useState(1)

  // Subtract: subTypeName → pending amount to subtract
  const [subtractPending, setSubtractPending] = useState<Map<string, number>>(new Map())

  // ── Data loading ────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch('/api/catalog/cards?limit=5000').then((r) => r.json()),
      token
        ? fetch('/api/collection', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json())
        : Promise.resolve([]),
    ]).then(([cards, collData]) => {
      setAllCards(cards)
      const map = new Map<string, number>()
      if (Array.isArray(collData)) {
        for (const e of collData as { productId: number; subTypeName: string; quantity: number }[]) {
          map.set(collKey(e.productId, e.subTypeName), e.quantity)
        }
      }
      setCollection(map)
    }).finally(() => setLoading(false))
  }, [token])

  // ── Derived state ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return allCards.filter((c) => {
      if (filters.name && !c.name?.toLowerCase().includes(filters.name.toLowerCase()))
        return false
      if (filters.sets.length > 0 && !filters.sets.includes(c.set_name ?? ''))
        return false
      if (filters.rarities.length > 0 && !filters.rarities.includes(c.ext_rarity ?? ''))
        return false
      if (filters.domains.length > 0) {
        const cardDomains = getCardDomains(c.ext_domain)
        const matchesNone   = filters.domains.includes('none') && cardDomains.length === 0
        const matchesDomain = filters.domains.some((d) => d !== 'none' && cardDomains.includes(d))
        if (!matchesNone && !matchesDomain) return false
      }
      if (filters.types.length > 0 && !filters.types.includes(normalizeCardType(c.ext_card_type)))
        return false
      return true
    })
  }, [allCards, filters])

  // Total owned per product_id (sum across all sub_type_names)
  const ownedByProduct = useMemo(() => {
    const map = new Map<number, number>()
    for (const [key, qty] of collection) {
      const productId = Number(key.split(':')[0])
      map.set(productId, (map.get(productId) ?? 0) + qty)
    }
    return map
  }, [collection])

  const pageCards  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  // ── Filter helpers ──────────────────────────────────────────────────────────

  const toggleFilter = (key: 'sets' | 'rarities' | 'domains' | 'types', value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }))
    setPage(0)
  }

  const clearFilters = () => { setFilters(EMPTY_FILTERS); setPage(0) }

  const hasActiveFilters =
    !!filters.name || filters.sets.length > 0 || filters.rarities.length > 0 ||
    filters.domains.length > 0 || filters.types.length > 0

  // ── Panel helpers ───────────────────────────────────────────────────────────

  const closePanel = () => {
    setPanelCard(null); setPanelMode(null)
    setPanelVariants([]); setPanelLoading(false)
    setAddSubType(null); setAddQty(1)
    setSubtractPending(new Map())
  }

  const fetchVariants = async (productId: number): Promise<Variant[]> => {
    setPanelLoading(true)
    try {
      const res = await fetch(`/api/catalog/${productId}/variants`)
      return await res.json()
    } finally {
      setPanelLoading(false)
    }
  }

  const openAdd = async (card: Card) => {
    setPanelCard(card); setPanelMode('add'); setAddQty(1)
    const variants = await fetchVariants(card.product_id)
    setPanelVariants(variants)
    const normal = variants.find((v) => v.subTypeName === 'Normal')
    setAddSubType(normal?.subTypeName ?? variants[0]?.subTypeName ?? null)
  }

  const openSubtract = async (card: Card) => {
    setPanelCard(card); setPanelMode('subtract')
    setSubtractPending(new Map())
    const variants = await fetchVariants(card.product_id)
    setPanelVariants(variants)
  }

  // ── API actions ─────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!addSubType || addQty <= 0 || !token || !panelCard) return
    const res = await fetch(`/api/collection/${panelCard.product_id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ delta: addQty, subTypeName: addSubType }),
    })
    if (res.ok) {
      const data = await res.json()
      setCollection((prev) => {
        const next = new Map(prev)
        const key  = collKey(panelCard.product_id, addSubType)
        if (data) next.set(key, data.quantity)
        return next
      })
      closePanel()
    }
  }

  const handleSubtractConfirm = async () => {
    if (!token || !panelCard) return
    for (const [subTypeName, amount] of subtractPending) {
      if (amount === 0) continue
      const res = await fetch(`/api/collection/${panelCard.product_id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ delta: -amount, subTypeName }),
      })
      if (res.ok) {
        const data = await res.json()
        const key  = collKey(panelCard.product_id, subTypeName)
        setCollection((prev) => {
          const next = new Map(prev)
          if (!data || data.quantity === 0) next.delete(key)
          else next.set(key, data.quantity)
          return next
        })
      }
    }
    closePanel()
  }

  // Owned variants for the subtract panel
  const ownedVariantsInPanel = panelCard
    ? panelVariants.filter((v) => (collection.get(collKey(panelCard.product_id, v.subTypeName)) ?? 0) > 0)
    : []

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="app">

      {/* Filters */}
      <div className="filter-bar">
        <input
          className="search"
          type="text"
          placeholder="Buscar carta..."
          value={filters.name}
          onChange={(e) => { setFilters((prev) => ({ ...prev, name: e.target.value })); setPage(0) }}
        />

        <div className="filter-row">
          <FilterDropdown label="Set"    options={SETS}    selected={filters.sets}    onToggle={(v) => toggleFilter('sets', v)} />
          <FilterDropdown label="Rareza" options={RARITIES} selected={filters.rarities} onToggle={(v) => toggleFilter('rarities', v)} />
          <FilterDropdown
            label="Tipo"
            options={CARD_TYPES.map((t) => ({ value: t, label: t }))}
            selected={filters.types}
            onToggle={(v) => toggleFilter('types', v)}
          />

          <div className="domain-filter">
            <span className="filter-label">Dominio</span>
            {DOMAINS.map((d) => {
              const active = filters.domains.includes(d)
              return (
                <button
                  key={d}
                  className={`domain-circle ${active ? 'active' : ''}`}
                  style={{ borderColor: DOMAIN_COLORS[d], background: active ? DOMAIN_COLORS[d] : 'transparent', color: active ? 'white' : DOMAIN_COLORS[d] }}
                  onClick={() => toggleFilter('domains', d)}
                  title={capitalize(d)}
                >
                  <img src={DOMAIN_ICONS[d]} alt={d} style={{ width: '28px', height: '28px', objectFit: 'contain', display: 'block' }} />
                </button>
              )
            })}
            <button
              className={`domain-circle ${filters.domains.includes('none') ? 'active' : ''}`}
              style={{ borderColor: '#6b7280', background: filters.domains.includes('none') ? '#6b7280' : 'transparent', color: filters.domains.includes('none') ? 'white' : '#6b7280' }}
              onClick={() => toggleFilter('domains', 'none')}
              title="Sin dominio"
            >–</button>
          </div>
        </div>

        {hasActiveFilters && (
          <button className="clear-filters" onClick={clearFilters}>Limpiar filtros ✕</button>
        )}
      </div>

      <p className="results-count">
        {loading ? 'Cargando...' : `${filtered.length} cartas encontradas`}
      </p>

      {/* Card grid */}
      <div className="grid">
        {pageCards.map((card) => {
          const owned = ownedByProduct.get(card.product_id) ?? 0
          return (
            <div key={card.product_id} className="card">
              {card.image_url ? (
                <div className="card-img-wrapper">
                  <img src={hqUrl(card.image_url)} alt={card.name} loading="lazy" />
                </div>
              ) : (
                <div className="no-image">Sin imagen</div>
              )}

              {owned > 0 && <span className="coll-owned-badge">{owned}</span>}

              <div className="coll-card-overlay">
                {owned > 0 && (
                  <button className="coll-btn coll-btn--sub" onClick={(e) => { e.stopPropagation(); openSubtract(card) }}>−</button>
                )}
                <button className="coll-btn coll-btn--add" onClick={(e) => { e.stopPropagation(); openAdd(card) }}>+</button>
              </div>

              <div className="card-body">
                <p className="card-name">{card.name}</p>
                <p className="card-set">{card.set_name}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button disabled={page === 0} onClick={() => setPage(page - 1)}>← Anterior</button>
        <span>Página {page + 1} de {totalPages || 1}</span>
        <button disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>Siguiente →</button>
      </div>

      {/* No-auth modal */}
      {panelCard && !token && (
        <div className="modal-backdrop" onClick={closePanel}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closePanel}>✕</button>
            <p style={{ padding: '2rem', textAlign: 'center' }}>Inicia sesión para gestionar tu colección.</p>
          </div>
        </div>
      )}

      {/* Add modal */}
      {panelCard && panelMode === 'add' && token && (
        <div className="modal-backdrop" onClick={closePanel}>
          <div className="modal coll-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closePanel}>✕</button>
            <h2 className="modal-name">Añadir · {panelCard.name}</h2>

            {panelLoading ? (
              <p className="coll-modal-loading">Cargando variantes...</p>
            ) : (
              <>
                <div className="coll-variant-list">
                  {panelVariants.map((v) => {
                    const owned = collection.get(collKey(panelCard.product_id, v.subTypeName)) ?? 0
                    return (
                      <label key={v.subTypeName} className="coll-variant-row">
                        <input
                          type="radio"
                          name="add-variant"
                          checked={addSubType === v.subTypeName}
                          onChange={() => setAddSubType(v.subTypeName)}
                        />
                        <span className="coll-variant-name">{v.subTypeName}</span>
                        {owned > 0 && <span className="coll-variant-owned">tienes {owned}</span>}
                      </label>
                    )
                  })}
                </div>

                <div className="coll-qty-row">
                  <label className="coll-qty-label">Cantidad</label>
                  <button className="coll-qty-btn" onClick={() => setAddQty((q) => Math.max(1, q - 1))}>−</button>
                  <input
                    className="coll-qty-input"
                    type="number" min={1} max={99}
                    value={addQty}
                    onChange={(e) => setAddQty(Math.max(1, Math.min(99, Number(e.target.value))))}
                  />
                  <button className="coll-qty-btn" onClick={() => setAddQty((q) => Math.min(99, q + 1))}>+</button>
                </div>

                <div className="coll-modal-actions">
                  <button className="btn-outline" onClick={closePanel}>Cancelar</button>
                  <button className="btn-accent" disabled={!addSubType} onClick={handleAdd}>Confirmar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Subtract modal */}
      {panelCard && panelMode === 'subtract' && token && (
        <div className="modal-backdrop" onClick={closePanel}>
          <div className="modal coll-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closePanel}>✕</button>
            <h2 className="modal-name">Gestionar · {panelCard.name}</h2>

            {panelLoading ? (
              <p className="coll-modal-loading">Cargando variantes...</p>
            ) : ownedVariantsInPanel.length === 0 ? (
              <p className="coll-modal-loading">No tienes ninguna copia de esta carta.</p>
            ) : (
              <>
                <div className="coll-variant-list">
                  {ownedVariantsInPanel.map((v) => {
                    const current = collection.get(collKey(panelCard.product_id, v.subTypeName)) ?? 0
                    const pending  = subtractPending.get(v.subTypeName) ?? 0
                    return (
                      <div key={v.subTypeName} className="coll-subtract-row">
                        <span className="coll-variant-name">{v.subTypeName}</span>
                        <span className="coll-subtract-qty">{current - pending}</span>
                        <button
                          className="coll-qty-btn"
                          disabled={pending >= current}
                          onClick={() => setSubtractPending((prev) => {
                            const next = new Map(prev)
                            next.set(v.subTypeName, (prev.get(v.subTypeName) ?? 0) + 1)
                            return next
                          })}
                        >−</button>
                      </div>
                    )
                  })}
                </div>

                <div className="coll-modal-actions">
                  <button className="btn-outline" onClick={closePanel}>Cancelar</button>
                  <button className="btn-accent" onClick={handleSubtractConfirm}>Confirmar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
