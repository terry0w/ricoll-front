import jsPDF from 'jspdf'
import { useEffect, useMemo, useState } from 'react'

interface Card {
  product_id: number
  name:       string
  image_url:  string
}

interface PrintEntry {
  productId: number
  quantity:  number
}

const CARDS_PER_SHEET = 9
const CARD_W   = 63
const CARD_H   = 88
const COLS     = 3
const GAP      = 3
const MARGIN_X = (210 - COLS * CARD_W - (COLS - 1) * GAP) / 2
const MARGIN_Y = (297 - COLS * CARD_H - (COLS - 1) * GAP) / 2

const hqUrl = (url: string) => url.replace('_200w.jpg', '_400w.jpg')

async function fetchAsDataUrl(url: string): Promise<string> {
  const res  = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader      = new FileReader()
    reader.onload     = () => resolve(reader.result as string)
    reader.onerror    = reject
    reader.readAsDataURL(blob)
  })
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export default function ProxyPage() {
  const [cards,      setCards]      = useState<Card[]>([])
  const [printList,  setPrintList]  = useState<PrintEntry[]>([])
  const [search,     setSearch]     = useState('')
  const [loading,    setLoading]    = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetch('/api/catalog/cards?limit=5000')
      .then(r => r.json())
      .then(data => { setCards(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() =>
    !search ? cards : cards.filter(c => c.name.toLowerCase().includes(search.toLowerCase())),
    [cards, search],
  )

  const cardMap = useMemo(() => {
    const m = new Map<number, Card>()
    cards.forEach(c => m.set(c.product_id, c))
    return m
  }, [cards])

  const flatPrint = useMemo(() =>
    printList.flatMap(({ productId, quantity }) => Array<number>(quantity).fill(productId)),
    [printList],
  )

  const sheets = useMemo(() => chunk(flatPrint, CARDS_PER_SHEET), [flatPrint])

  const addCard = (productId: number) =>
    setPrintList(prev => {
      const e = prev.find(e => e.productId === productId)
      return e
        ? prev.map(e => e.productId === productId ? { ...e, quantity: e.quantity + 1 } : e)
        : [...prev, { productId, quantity: 1 }]
    })

  const decCard = (productId: number) =>
    setPrintList(prev => {
      const e = prev.find(e => e.productId === productId)
      if (!e) return prev
      return e.quantity <= 1
        ? prev.filter(e => e.productId !== productId)
        : prev.map(e => e.productId === productId ? { ...e, quantity: e.quantity - 1 } : e)
    })

  const removeEntry = (productId: number) =>
    setPrintList(prev => prev.filter(e => e.productId !== productId))

  const setQty = (productId: number, qty: number) => {
    if (qty <= 0) { removeEntry(productId); return }
    setPrintList(prev => prev.map(e => e.productId === productId ? { ...e, quantity: qty } : e))
  }

  const generatePdf = async () => {
    if (sheets.length === 0 || generating) return
    setGenerating(true)
    try {
      const pdf   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const cache = new Map<string, string>()

      for (let si = 0; si < sheets.length; si++) {
        if (si > 0) pdf.addPage()

        for (let ci = 0; ci < sheets[si].length; ci++) {
          const col  = ci % COLS
          const row  = Math.floor(ci / COLS)
          const x    = MARGIN_X + col * (CARD_W + GAP)
          const y    = MARGIN_Y + row * (CARD_H + GAP)

          const card = cardMap.get(sheets[si][ci])
          if (!card?.image_url) continue

          const proxyUrl = `/api/catalog/image-proxy?url=${encodeURIComponent(hqUrl(card.image_url))}`
          let dataUrl    = cache.get(proxyUrl)
          if (!dataUrl) {
            dataUrl = await fetchAsDataUrl(proxyUrl)
            cache.set(proxyUrl, dataUrl)
          }

          pdf.addImage(dataUrl, 'JPEG', x, y, CARD_W, CARD_H)
        }
      }

      pdf.save('ricoll-proxys.pdf')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="proxy-page">

      {/* ── Catálogo izquierdo ── */}
      <div className="proxy-left">
        <p className="proxy-hint">Haz clic en una carta para añadirla al folio</p>
        <input
          className="search"
          type="text"
          placeholder="Buscar carta..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {loading
          ? <p className="results-count">Cargando catálogo...</p>
          : <p className="results-count">{filtered.length} cartas</p>
        }
        <div className="proxy-catalog-grid">
          {filtered.map(card => (
            <div
              key={card.product_id}
              className="proxy-catalog-card"
              onClick={() => addCard(card.product_id)}
              title={card.name}
            >
              {card.image_url
                ? <img src={card.image_url} alt={card.name} draggable={false} />
                : <span className="proxy-catalog-noimg">{card.name}</span>
              }
            </div>
          ))}
        </div>
      </div>

      {/* ── Panel derecho ── */}
      <div className="proxy-right">

        {/* Cabecera con botón de imprimir */}
        <div className="proxy-right-header">
          <h2 className="proxy-title">
            {flatPrint.length === 0
              ? 'Vista previa'
              : `${flatPrint.length} carta${flatPrint.length !== 1 ? 's' : ''} · ${sheets.length} folio${sheets.length !== 1 ? 's' : ''}`
            }
          </h2>
          <button
            className="btn-primary proxy-print-btn"
            onClick={generatePdf}
            disabled={sheets.length === 0 || generating}
          >
            {generating ? 'Generando PDF...' : '⬇ Descargar PDF'}
          </button>
        </div>

        {sheets.length === 0 && (
          <p className="proxy-empty">Añade cartas desde el catálogo para generar el folio de impresión.</p>
        )}

        {/* Folios A4 */}
        <div className="proxy-sheets-area">
          {sheets.map((sheetCards, si) => (
            <div key={si} className="proxy-sheet-outer">
              <div className="proxy-sheet">
                {sheetCards.map((productId, ci) => {
                  const card = cardMap.get(productId)
                  return (
                    <div key={`${productId}-${ci}`} className="proxy-card-cell">
                      {card?.image_url
                        ? <img src={hqUrl(card.image_url)} alt={card?.name} draggable={false} />
                        : <span className="proxy-card-noimg">{card?.name ?? ''}</span>
                      }
                    </div>
                  )
                })}
                {/* Celdas vacías para completar la cuadrícula */}
                {Array.from({ length: CARDS_PER_SHEET - sheetCards.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="proxy-card-cell proxy-card-empty" />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Lista editable de cartas */}
        <div className="proxy-list-section">
          <h3 className="proxy-list-title">Cartas añadidas</h3>
          {printList.length === 0 ? (
            <p className="proxy-list-empty">Sin cartas. Haz clic en el catálogo para añadir.</p>
          ) : (
            <ul className="proxy-list">
              {printList.map(({ productId, quantity }) => {
                const card = cardMap.get(productId)
                return (
                  <li key={productId} className="proxy-list-row">
                    <span className="proxy-list-name" title={card?.name}>{card?.name ?? `#${productId}`}</span>
                    <div className="proxy-qty-ctrl">
                      <button onClick={() => decCard(productId)}>−</button>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={quantity}
                        onChange={e => setQty(productId, Number(e.target.value))}
                        className="proxy-qty-input"
                      />
                      <button onClick={() => addCard(productId)}>+</button>
                      <button className="proxy-remove-btn" onClick={() => removeEntry(productId)}>✕</button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}
