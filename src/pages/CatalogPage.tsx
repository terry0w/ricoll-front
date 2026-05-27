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
  { value: 'origins',                 label: 'Origins'        },
  { value: 'origins_proving_grounds', label: 'Proving Grounds'},
  { value: 'spiritforged',            label: 'Spiritforged'   },
  { value: 'unleashed',               label: 'Unleashed'      },
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

const normalizeCardType = (extCardType: string | null): string => {
  if (!extCardType) return ''
  const lower = extCardType.toLowerCase()
  if (lower.includes('token'))       return 'Token'      // Unit;Token / Gear;Token → Token
  if (lower.includes('rune'))        return 'Rune'
  if (lower.includes('signature'))   return 'Signature'
  if (lower.includes('unit'))        return 'Unit'       // Champion Unit → Unit
  if (lower.includes('gear'))        return 'Gear'
  if (lower.includes('spell'))       return 'Spell'
  if (lower.includes('battlefield')) return 'Battlefield'
  if (lower.includes('legend'))      return 'Legend'
  return ''
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const isFoil = (subTypeName: string | null) => subTypeName === 'Foil'

const DOMAIN_PATTERN = 'fury|calm|mind|body|chaos|order'
const genericPip = (n: number) =>
  `<span class="cost-pip cost-pip--generic">${n}</span>`
const domainPip = (domain: string, icons: Record<string, string>) =>
  `<img src="${icons[domain.toLowerCase()]}" class="cost-pip cost-pip--domain" alt="${domain}" />`
const domainPips = (n: number, domain: string, icons: Record<string, string>) =>
  Array.from({ length: n }, () => domainPip(domain, icons)).join('')

function injectCostIcons(html: string, icons: Record<string, string>): string {
  let out = html

  // pay N and N Domain → 1 generic circle(N) + N domain pips
  out = out.replace(
    new RegExp(`pay (\\d+) and (\\d+) (${DOMAIN_PATTERN})`, 'gi'),
    (_, n1, n2, d) => `pay ${genericPip(+n1)}${domainPips(+n2, d, icons)}`,
  )
  // pay N and Domain → 1 generic circle(N) + 1 domain pip
  out = out.replace(
    new RegExp(`pay (\\d+) and (${DOMAIN_PATTERN})`, 'gi'),
    (_, n, d) => `pay ${genericPip(+n)}${domainPip(d, icons)}`,
  )
  // pay N Domain → N domain pips
  out = out.replace(
    new RegExp(`pay (\\d+) (${DOMAIN_PATTERN})`, 'gi'),
    (_, n, d) => `pay ${domainPips(+n, d, icons)}`,
  )
  // pay N → 1 generic circle(N)
  out = out.replace(
    /pay (\d+)/gi,
    (_, n) => `pay ${genericPip(+n)}`,
  )

  return out
}

// Types that have energy/power/might stats — Tokens, Battlefields, Legends and Runes don't
const STATS_TYPES = new Set(['Unit', 'Spell', 'Gear', 'Signature'])

const PAGE_SIZE = 50
const hqUrl = (url: string) => url.replace('_200w.jpg', '_400w.jpg')

const EMPTY_FILTERS = {
  name:     '',
  sets:     [] as string[],
  rarities: [] as string[],
  domains:  [] as string[],
  types:    [] as string[],
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

export default function CatalogPage() {
  const [allCards, setAllCards] = useState<Card[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<Card | null>(null)
  const [filters, setFilters]   = useState(EMPTY_FILTERS)
  const [page, setPage]         = useState(0)

  useEffect(() => {
    fetch('/api/catalog/cards?limit=5000')
      .then((r) => r.json())
      .then(setAllCards)
      .finally(() => setLoading(false))
  }, [])

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
                  <img src={DOMAIN_ICONS[d]} alt={d} style={{ width: '28px', height: '28px', objectFit: 'contain', display: 'block' }} />
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
        {pageCards.map((p) => (
          <div
            key={p.product_id}
            className={`card ${isFoil(p.sub_type_name) ? 'foil' : ''} ${cardType(p.ext_card_type) === 'Battlefield' && p.set_name !== 'origins' ? 'bf-landscape' : ''}`}
            onClick={() => setSelected(p)}
          >
            {p.image_url ? (
              <div className="card-img-wrapper">
                <img src={hqUrl(p.image_url)} alt={p.name} loading="lazy" />
              </div>
            ) : (
              <div className="no-image">Sin imagen</div>
            )}
            <div className="card-body">
              <p className="card-name">{p.name}</p>
              <p className="card-set">{p.set_name}</p>
              {p.market_price != null && (
                <p className="card-price">${Number(p.market_price).toFixed(2)}</p>
              )}
            </div>
          </div>
        ))}
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

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)}>✕</button>

            <div className="modal-layout">

              {/* Image — 30%, full height, foil shimmer if applicable */}
              {selected.image_url && (
                <div className={`modal-img ${isFoil(selected.sub_type_name) ? 'foil' : ''}`}>
                  <div className="card-img-wrapper">
                    <img src={hqUrl(selected.image_url)} alt={selected.name} />
                  </div>
                </div>
              )}

              {/* Data — 70% */}
              <div className="modal-info">
                <h2 className="modal-name">{selected.name}</h2>

                <div className="modal-meta">
                  {/* Col 1: Type, Rarity, Domain */}
                  <div className="meta-col">
                    {selected.ext_card_type && (
                      <div className="meta-row">
                        <span className="meta-label">Type</span>
                        <span className="meta-value">{selected.ext_card_type}</span>
                      </div>
                    )}
                    {selected.ext_rarity && (
                      <div className="meta-row">
                        <span className="meta-label">Rarity</span>
                        <span className="meta-value">{selected.ext_rarity}</span>
                      </div>
                    )}
                    {selected.ext_domain && (
                      <div className="meta-row">
                        <span className="meta-label">Domain</span>
                        <div className="meta-domains">
                          {selected.ext_domain.split(';').map((d) => (
                            <span
                              key={d}
                              className="domain-badge"
                              style={{ background: DOMAIN_COLORS[d.trim().toLowerCase()], color: 'white' }}
                            >
                              {d.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Col 2: Energy, Power, Might — only for stat-bearing types */}
                  {STATS_TYPES.has(normalizeCardType(selected.ext_card_type)) && (
                    <div className="meta-col">
                      <div className="meta-row">
                        <span className="meta-label">Energy</span>
                        <span className="meta-stat">{selected.ext_energy_cost ?? 0}</span>
                      </div>
                      <div className="meta-row">
                        <span className="meta-label">Power</span>
                        <span className="meta-stat">{selected.ext_power_cost ?? 0}</span>
                      </div>
                      <div className="meta-row">
                        <span className="meta-label">Might</span>
                        <span className="meta-stat">{selected.ext_might ?? 0}</span>
                      </div>
                    </div>
                  )}
                </div>

                {selected.ext_description && (
                  <div
                    className="modal-description"
                    dangerouslySetInnerHTML={{ __html: injectCostIcons(selected.ext_description, DOMAIN_ICONS) }}
                  />
                )}

                {selected.ext_flavor_text && (
                  <div
                    className="modal-flavor"
                    dangerouslySetInnerHTML={{ __html: injectCostIcons(selected.ext_flavor_text, DOMAIN_ICONS) }}
                  />
                )}

                <div className="modal-footer">
                  <span>{selected.set_name}</span>
                  {selected.ext_number && <span>· {selected.ext_number}</span>}
                  {isFoil(selected.sub_type_name) && <span className="footer-foil">· Foil</span>}
                  <div className="footer-prices">
                    {selected.low_price    != null && <span>Low ${Number(selected.low_price).toFixed(2)}</span>}
                    {selected.market_price != null && <span>Market ${Number(selected.market_price).toFixed(2)}</span>}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
