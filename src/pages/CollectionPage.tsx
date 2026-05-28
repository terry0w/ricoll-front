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

interface Card {
  product_id: number
  name: string
  set_name: string
  image_url: string
  market_price: number | null
  low_price: number | null
  sub_type_name: string | null
  ext_rarity: string | null
  ext_number: string | null
  ext_card_type: string | null
  ext_domain: string | null
  ext_energy_cost: number | null
  ext_power_cost: number | null
  ext_might: number | null
  ext_tag: string | null
  ext_description: string | null
  ext_flavor_text: string | null
}

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
  fury:  '#e8604c',
  calm:  '#2980b9',
  mind:  '#8e44ad',
  body:  '#27ae60',
  chaos: '#4a3060',
  order: '#e6c020',
}

const DOMAIN_ICONS: Record<string, string> = {
  fury:  furyIcon,
  calm:  calmIcon,
  mind:  mindIcon,
  body:  bodyIcon,
  chaos: chaosIcon,
  order: orderIcon,
}

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

const PAGE_SIZE = 50
const hqUrl = (url: string) => url.replace('_200w.jpg', '_400w.jpg')

const EMPTY_FILTERS = {
  name:     '',
  sets:     [] as string[],
  rarities: [] as string[],
  domains:  [] as string[],
  types:    [] as string[],
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const baseName = (name: string) => name.replace(/\s*\(.*\)\s*$/, '').trim()
const isFoil   = (card: Card)   => card.sub_type_name?.toLowerCase().includes('foil') ?? false

const variantLabel = (card: Card): string => {
  const base   = baseName(card.name)
  const suffix = card.name.slice(base.length).trim().replace(/^\(|\)$/g, '').trim()
  return suffix || (isFoil(card) ? 'Foil' : 'Normal')
}

function FilterDropdown({
  label,
  options,
  selected,
  onToggle,
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
                <img
                  src={opt.icon}
                  alt={opt.label}
                  style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                />
              )}
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CollectionPage() {
  const { token } = useAuth()

  const [allCards,   setAllCards]   = useState<Card[]>([])
  const [collection, setCollection] = useState<Map<number, number>>(new Map())
  const [loading,    setLoading]    = useState(true)
  const [filters,    setFilters]    = useState(EMPTY_FILTERS)
  const [page,       setPage]       = useState(0)

  // Panel state
  const [panelBase, setPanelBase] = useState<string | null>(null)
  const [panelMode, setPanelMode] = useState<'add' | 'subtract' | null>(null)

  // Add state
  const [addVariantId, setAddVariantId] = useState<number | null>(null)
  const [addQty,       setAddQty]       = useState(1)

  // Subtract state: productId → pending amount to subtract
  const [subtractPending, setSubtractPending] = useState<Map<number, number>>(new Map())

  useEffect(() => {
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {}

    Promise.all([
      fetch('/api/catalog/cards?limit=5000').then((r) => r.json()),
      token
        ? fetch('/api/collection', { headers }).then((r) => r.json())
        : Promise.resolve([]),
    ]).then(([cards, collectionData]) => {
      setAllCards(cards)
      const map = new Map<number, number>()
      if (Array.isArray(collectionData)) {
        for (const entry of collectionData as { productId: number; quantity: number }[]) {
          map.set(entry.productId, entry.quantity)
        }
      }
      setCollection(map)
    }).finally(() => setLoading(false))
  }, [token])

  // Deduplicated cards: one per baseName, choosing best representative image
  const uniqueCards = useMemo(() => {
    const groups = new Map<string, Card[]>()
    for (const card of allCards) {
      const key = baseName(card.name)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(card)
    }

    const result: Card[] = []
    for (const [, variants] of groups) {
      // Priorizar Rare no-foil; si solo hay foil Rare, coger foil; si no hay Rare, coger primera no-foil
      const rares = variants.filter((c) => c.ext_rarity === 'Rare')
      let representative: Card

      if (rares.length > 0) {
        const rareNonFoil = rares.find((c) => !isFoil(c))
        representative = rareNonFoil ?? rares[0]
      } else {
        const nonFoil = variants.find((c) => !isFoil(c))
        representative = nonFoil ?? variants[0]
      }

      result.push(representative)
    }

    return result
  }, [allCards])

  // Apply filters on the deduplicated cards
  const filtered = useMemo(() => {
    return uniqueCards.filter((c) => {
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
  }, [uniqueCards, filters])

  // Owned count per baseName (sum of all variants)
  const ownedByBase = useMemo(() => {
    const map = new Map<string, number>()
    for (const card of allCards) {
      const key = baseName(card.name)
      const qty = collection.get(card.product_id) ?? 0
      map.set(key, (map.get(key) ?? 0) + qty)
    }
    return map
  }, [allCards, collection])

  const pageCards  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const toggleFilter = (key: 'sets' | 'rarities' | 'domains' | 'types', value: string) => {
    setFilters((prev) => {
      const current = prev[key]
      return {
        ...prev,
        [key]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      }
    })
    setPage(0)
  }

  const clearFilters = () => { setFilters(EMPTY_FILTERS); setPage(0) }

  const hasActiveFilters =
    !!filters.name ||
    filters.sets.length > 0 ||
    filters.rarities.length > 0 ||
    filters.domains.length > 0 ||
    filters.types.length > 0

  const closePanel = () => {
    setPanelBase(null)
    setPanelMode(null)
    setAddVariantId(null)
    setAddQty(1)
    setSubtractPending(new Map())
  }

  const openAdd = (base: string) => {
    const variants = allCards.filter((c) => baseName(c.name) === base)
    const firstNonFoil = variants.find((c) => !isFoil(c))
    const preSelected  = firstNonFoil ?? variants[0]
    setPanelBase(base)
    setPanelMode('add')
    setAddVariantId(preSelected?.product_id ?? null)
    setAddQty(1)
  }

  const openSubtract = (base: string) => {
    setPanelBase(base)
    setPanelMode('subtract')
    setSubtractPending(new Map())
  }

  const handleAdd = async () => {
    if (!addVariantId || addQty <= 0 || !token) return
    const res = await fetch(`/api/collection/${addVariantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ delta: addQty }),
    })
    if (res.ok) {
      const data = await res.json()
      setCollection((prev) => {
        const next = new Map(prev)
        if (data) next.set(addVariantId, data.quantity)
        return next
      })
      closePanel()
    }
  }

  const handleSubtractConfirm = async () => {
    if (!token) return
    for (const [productId, amount] of subtractPending) {
      if (amount === 0) continue
      const res = await fetch(`/api/collection/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ delta: -amount }),
      })
      if (res.ok) {
        const data = await res.json()
        setCollection((prev) => {
          const next = new Map(prev)
          if (!data || data.quantity === 0) next.delete(productId)
          else next.set(productId, data.quantity)
          return next
        })
      }
    }
    closePanel()
  }

  // Variants for the active panel base
  const panelVariants = panelBase
    ? allCards.filter((c) => baseName(c.name) === panelBase)
    : []

  // For subtract panel: only variants currently owned
  const ownedVariants = panelVariants.filter(
    (c) => (collection.get(c.product_id) ?? 0) > 0,
  )

  return (
    <div className="app">
      <div className="filter-bar">
        <input
          className="search"
          type="text"
          placeholder="Buscar carta..."
          value={filters.name}
          onChange={(e) => {
            setFilters((prev) => ({ ...prev, name: e.target.value }))
            setPage(0)
          }}
        />

        <div className="filter-row">
          <FilterDropdown
            label="Set"
            options={SETS}
            selected={filters.sets}
            onToggle={(v) => toggleFilter('sets', v)}
          />
          <FilterDropdown
            label="Rareza"
            options={RARITIES}
            selected={filters.rarities}
            onToggle={(v) => toggleFilter('rarities', v)}
          />
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
                  style={{
                    borderColor: DOMAIN_COLORS[d],
                    background:  active ? DOMAIN_COLORS[d] : 'transparent',
                    color:       active ? 'white' : DOMAIN_COLORS[d],
                  }}
                  onClick={() => toggleFilter('domains', d)}
                  title={capitalize(d)}
                >
                  <img
                    src={DOMAIN_ICONS[d]}
                    alt={d}
                    style={{ width: '28px', height: '28px', objectFit: 'contain', display: 'block' }}
                  />
                </button>
              )
            })}
            <button
              className={`domain-circle ${filters.domains.includes('none') ? 'active' : ''}`}
              style={{
                borderColor: '#6b7280',
                background:  filters.domains.includes('none') ? '#6b7280' : 'transparent',
                color:       filters.domains.includes('none') ? 'white' : '#6b7280',
              }}
              onClick={() => toggleFilter('domains', 'none')}
              title="Sin dominio"
            >
              –
            </button>
          </div>
        </div>

        {hasActiveFilters && (
          <button className="clear-filters" onClick={clearFilters}>
            Limpiar filtros ✕
          </button>
        )}
      </div>

      <p className="results-count">
        {loading ? 'Cargando...' : `${filtered.length} cartas encontradas`}
      </p>

      <div className="grid">
        {pageCards.map((card) => {
          const base  = baseName(card.name)
          const owned = ownedByBase.get(base) ?? 0
          return (
            <div
              key={card.product_id}
              className="card"
            >
              {card.image_url ? (
                <div className="card-img-wrapper">
                  <img src={hqUrl(card.image_url)} alt={card.name} loading="lazy" />
                </div>
              ) : (
                <div className="no-image">Sin imagen</div>
              )}

              <div className="coll-card-overlay">
                {owned > 0 && (
                  <span className="coll-owned-badge">{owned}</span>
                )}
                {owned > 0 && (
                  <button
                    className="coll-btn coll-btn--sub"
                    onClick={(e) => { e.stopPropagation(); openSubtract(base) }}
                  >
                    −
                  </button>
                )}
                <button
                  className="coll-btn coll-btn--add"
                  onClick={(e) => { e.stopPropagation(); openAdd(base) }}
                >
                  +
                </button>
              </div>

              <div className="card-body">
                <p className="card-name">{base}</p>
                <p className="card-set">{card.set_name}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="pagination">
        <button disabled={page === 0} onClick={() => setPage(page - 1)}>
          ← Anterior
        </button>
        <span>Página {page + 1} de {totalPages || 1}</span>
        <button disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>
          Siguiente →
        </button>
      </div>

      {/* No-auth modal */}
      {panelBase && !token && (
        <div className="modal-backdrop" onClick={closePanel}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closePanel}>✕</button>
            <p style={{ padding: '2rem', textAlign: 'center' }}>
              Inicia sesión para gestionar tu colección
            </p>
          </div>
        </div>
      )}

      {/* Add modal */}
      {panelBase && panelMode === 'add' && token && (
        <div className="modal-backdrop" onClick={closePanel}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closePanel}>✕</button>

            <h2 className="modal-name" style={{ marginBottom: '1rem' }}>
              Añadir · {panelBase}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {panelVariants.map((variant) => {
                const currentOwned = collection.get(variant.product_id) ?? 0
                return (
                  <label key={variant.product_id} className="filter-check-item" style={{ gap: '0.5rem' }}>
                    <input
                      type="radio"
                      name="add-variant"
                      checked={addVariantId === variant.product_id}
                      onChange={() => setAddVariantId(variant.product_id)}
                    />
                    <span>{variantLabel(variant)}</span>
                    {currentOwned > 0 && (
                      <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                        tienes {currentOwned}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <label htmlFor="add-qty" style={{ fontWeight: 500 }}>Cantidad:</label>
              <input
                id="add-qty"
                type="number"
                min={1}
                max={99}
                value={addQty}
                onChange={(e) => setAddQty(Math.max(1, Math.min(99, Number(e.target.value))))}
                style={{ width: '5rem', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={closePanel} style={{ padding: '0.4rem 1rem' }}>Cancelar</button>
              <button
                onClick={handleAdd}
                disabled={!addVariantId || addQty <= 0}
                style={{ padding: '0.4rem 1rem', fontWeight: 600 }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtract modal */}
      {panelBase && panelMode === 'subtract' && token && (
        <div className="modal-backdrop" onClick={closePanel}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closePanel}>✕</button>

            <h2 className="modal-name" style={{ marginBottom: '1rem' }}>
              Gestionar · {panelBase}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {ownedVariants.map((variant) => {
                const currentQty = collection.get(variant.product_id) ?? 0
                const pending    = subtractPending.get(variant.product_id) ?? 0
                return (
                  <div
                    key={variant.product_id}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.25rem 0' }}
                  >
                    <span style={{ flex: 1 }}>{variantLabel(variant)}</span>
                    <span style={{ minWidth: '3rem', textAlign: 'center', fontWeight: 600 }}>
                      {currentQty - pending}
                    </span>
                    <button
                      disabled={pending >= currentQty}
                      onClick={() =>
                        setSubtractPending((prev) => {
                          const next = new Map(prev)
                          next.set(variant.product_id, (prev.get(variant.product_id) ?? 0) + 1)
                          return next
                        })
                      }
                      style={{ padding: '0.2rem 0.6rem', fontWeight: 700, fontSize: '1rem' }}
                    >
                      −
                    </button>
                  </div>
                )
              })}

              {ownedVariants.length === 0 && (
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                  No tienes ninguna variante de esta carta.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={closePanel} style={{ padding: '0.4rem 1rem' }}>Cancelar</button>
              <button
                onClick={handleSubtractConfirm}
                style={{ padding: '0.4rem 1rem', fontWeight: 600 }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
