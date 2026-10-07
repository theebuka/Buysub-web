'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { toast } from "sonner"
import { useTheme as useThemeController } from '@/lib/theme'
import { getAccessToken } from '@/lib/session'
import { API_BASE } from '@/lib/config'

import { ALL_CATEGORIES, API, EmptyState, Loading, PillBadge, Product, StarIcon, StatChip, T, actionBtnStyle, apiFetch, fmt, inputStyle, logoUrl, refinedPageBtnStyle, sentenceCase } from '../_lib/shared'
import { ProductFormPanel } from './ProductForm'

// ════════════════════ PRODUCTS TAB (full overhaul) ════════════════════
export const EMPTY_PRODUCT = (): Partial<Product> & { [k: string]: any } => ({
  name: '',
  slug: '',
  category: '',
  tags: '',
  description: '',
  short_description: '',
  category_tagline: '',
  domain: '',
  billing_type: 'subscription',
  billing_period: '',
  price_1m: 0,
  price_3m: 0,
  price_6m: 0,
  price_1y: 0,
  stock_status: 'in_stock',
  status: 'active',
  featured: false,
  sort_order: 100,
  image_url: '',
  whatsapp_group_url: '',
  social_links: { telegram: '', instagram: '', twitter: '', tiktok: '', discord: '', website: '' },
  badge: '', delivery_time: '', delivery_method: '', region: '',
  features: [], how_it_works: [], faqs: [],
  seo_title: '', seo_description: '',
})

export function ProductsTab() {
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [showCreate, setShowCreate] = useState(false)
  const [newProduct, setNewProduct] = useState<any>(EMPTY_PRODUCT())
  const [creating, setCreating] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 24

  // Fetch ALL products for stable client-side filtering+pagination
  const loadAll = useCallback(async () => {
    setLoading(true)

    let page = 1
    let products: Product[] = []

    while (true) {
      const r = await apiFetch(`/v2/admin/products?limit=100&page=${page}`)

      if (!r.ok || !r.data?.length) break

      products = products.concat(r.data)

      if (r.data.length < 100) break
      page++
    }

    setAllProducts(products)
    setLoading(false)
  }, [])
  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Client-side filter+paginate
  const filtered = useMemo(() => {
    let list = allProducts
    if (statusFilter) list = list.filter(p => p.status === statusFilter)
    if (categoryFilter) list = list.filter(p => (p.category || '').toLowerCase().includes(categoryFilter.toLowerCase()))
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.tags || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [allProducts, statusFilter, categoryFilter, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  useEffect(() => { setPage(1) }, [search, statusFilter, categoryFilter])

  // Summary counts (for header strip)
  const counts = useMemo(() => ({
    total: allProducts.length,
    active: allProducts.filter(p => p.status === 'active').length,
    hidden: allProducts.filter(p => p.status === 'hidden').length,
    oos: allProducts.filter(p => p.stock_status !== 'in_stock').length,
  }), [allProducts])

  const toggleStatus = async (p: Product) => {
    const ns = p.status === 'active' ? 'hidden' : 'active'
    const r = await apiFetch(`/v2/admin/products/${p.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: ns })
    })
    console.log('STATUS RESPONSE:', r)
    if (r.ok) {
      toast.success("Status updated")
      await loadAll()
    } else {
      toast.error(r.error || 'Failed to update status')
    }
  }
  const toggleStock = async (p: Product) => {
    const ns = p.stock_status === 'in_stock' ? 'out_of_stock' : 'in_stock'
    const r = await apiFetch(`/v2/admin/products/${p.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ stock_status: ns })
    })
    if (r.ok) {
      await loadAll()
      toast.success("Stock inventory updated")
    } else {
      toast.error(r.error || 'Failed to update stock')
    }
  }
  const archiveProduct = async (p: Product) => {
    if (!confirm(`Archive "${p.name}"?`)) return
    const r = await apiFetch(`/v2/admin/products/${p.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'archived' })
    })
    if (r.ok) {
      await loadAll()
      toast.success("Product Archived")
    } else {
      toast.error(r.error || 'Failed to archive')
    }
  }

  const startEdit = (p: Product) => {
    setEditingId(p.id)
    setEditForm({
      name: p.name,
      slug: p.slug,
      category: p.category,
      tags: p.tags,
      description: p.description || '',
      short_description: p.short_description || '',
      category_tagline: p.category_tagline || '',
      domain: p.domain || '',
      billing_type: p.billing_type || 'subscription',
      billing_period: p.billing_period || '',
      price_1m: p.price_1m || 0,
      price_3m: p.price_3m || 0,
      price_6m: p.price_6m || 0,
      price_1y: p.price_1y || 0,
      stock_status: p.stock_status,
      status: p.status,
      featured: !!p.featured,
      sort_order: p.sort_order || 100,
      image_url: p.image_url || '',
      // Product page content. Admin lists select '*', so these arrive with the
      // row once migration 07 is applied; before that they're simply absent.
      badge: (p as any).badge || '',
      delivery_time: (p as any).delivery_time || '',
      delivery_method: (p as any).delivery_method || '',
      region: (p as any).region || '',
      features: (p as any).features || [],
      how_it_works: (p as any).how_it_works || [],
      faqs: (p as any).faqs || [],
      seo_title: (p as any).seo_title || '',
      seo_description: (p as any).seo_description || '',
    })
  }

  const saveEdit = async () => {
    if (!editingId) return
    const r = await apiFetch(`/v2/admin/products/${editingId}`, { method: 'PATCH', body: JSON.stringify(editForm) })
    if (r.ok && r.data) {
      setAllProducts(prev => prev.map(x => x.id === editingId ? { ...x, ...r.data } : x))
      setEditingId(null)
    } else toast.error(r.error || r.data?.error || 'Failed to save. Check that all fields are valid.')
  }

  const createProduct = async () => {
    if (!newProduct.name) { toast.error('Name is required'); return }
    setCreating(true)
    const slug = newProduct.slug || newProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')
    const r = await apiFetch('/v2/admin/products', { method: 'POST', body: JSON.stringify({ ...newProduct, slug }) })
    if (r.ok) {
      setNewProduct(EMPTY_PRODUCT())
      setShowCreate(false)
      await loadAll()
    } else toast.error(r.error || r.data?.error || 'Failed to create. API route /v2/admin/products POST may need to be added.')
    setCreating(false)
  }

  const IS = inputStyle()

  // Uppercase section label style (tiny all-caps)
  const metaLabel: React.CSSProperties = {
    fontSize: 'var(--bs-text-2xs)',
    color: T.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 600,
  }

  // Generate a stable accent color per product name (same pattern as marketplace fallback avatar)
  const avatarTintFor = (name: string) => {
    const code = (name || '?').charCodeAt(0)
    const hues = [262, 200, 150, 30, 340, 20, 280, 180]
    const hue = hues[code % hues.length]
    return { bg: `hsl(${hue}, 65%, 18%)`, fg: `hsl(${hue}, 75%, 68%)` }
  }

  // Primary price for display on the card (prefer 1M, fall back in order)
  const primaryPrice = (p: Product) =>
    p.price_1m || p.price_3m || p.price_6m || p.price_1y || 0

  return (
    <div>
      <style>{`
        /* Deliberately does NOT set box-shadow, so the --bs-ring focus ring
           from Shell still lands on these inputs. This rule only recolours the
           border on top of it. */
        .bs-pt-input:focus,
        .bs-pt-input:focus-visible {
          outline: none !important;
          border-color: var(--bs-accent) !important;
        }
        .bs-pt-card {
          transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
        }
        .bs-pt-card:hover {
          border-color: var(--bs-border-strong) !important;
          transform: translateY(-1px);
        }
        .bs-pt-action {
          transition: all 0.15s ease;
        }
        .bs-pt-action:hover:not(:disabled) {
          background: var(--bs-bg-muted) !important;
        }
        .bs-pt-action-danger:hover:not(:disabled) {
          background: rgba(var(--bs-error-rgb), 0.08) !important;
          border-color: rgba(var(--bs-error-rgb), 0.35) !important;
          color: var(--bs-error) !important;
        }
        .bs-pt-action-accent:hover:not(:disabled) {
          background: rgba(var(--bs-accent-rgb), 0.1) !important;
          border-color: rgba(var(--bs-accent-rgb), 0.4) !important;
          /* accent-as-TEXT, so it takes the on-surface sibling. Plain #7C5CFF
             measures 4.0:1 on white and fails AA. */
          color: var(--bs-accent-on-surface) !important;
        }
        .bs-pt-new-btn:hover {
          background: var(--bs-accent-hover) !important;
        }
        .bs-pt-page-btn:hover:not(:disabled) {
          background: var(--bs-bg-muted) !important;
          border-color: var(--bs-border-strong) !important;
        }
      `}</style>

      {/* ============================================================ */}
      {/* TOP BAR — COUNTS + FILTERS                                   */}
      {/* ============================================================ */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 14,
        marginBottom: 18,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
        }}>
          <div style={{
            fontSize: 'var(--bs-text-xl)',
            fontWeight: 700,
            color: T.text,
            lineHeight: 1,
          }}>
            Products
          </div>
          <div style={{
            fontSize: 12,
            color: T.textMuted,
          }}>
            {counts.total} total
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StatChip label="Active" value={counts.active} />
          <StatChip label="Hidden" value={counts.hidden} />
          <StatChip label="Out of stock" value={counts.oos} />
        </div>
      </div>

      {/* Filter row */}
      <div style={{
        display: 'flex',
        gap: 10,
        marginBottom: 20,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 340 }}>
          <input
            className="bs-pt-input"
            placeholder="Search name, category, or tag…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...IS, paddingLeft: 36, width: '100%' }}
          />
          <div style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: T.textMuted,
            pointerEvents: 'none',
            fontSize: 'var(--bs-text-sm)',
          }}>
            ⌕
          </div>
        </div>

        <select
          className="bs-pt-input"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ ...IS, width: 150, flex: 'none' }}
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="hidden">Hidden</option>
        </select>

        <select
          className="bs-pt-input"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{ ...IS, width: 200, flex: 'none' }}
        >
          <option value="">All categories</option>
          {ALL_CATEGORIES.filter(c => c !== 'all').map(c => (
            <option key={c} value={c}>{sentenceCase(c)}</option>
          ))}
        </select>

        {(search || statusFilter || categoryFilter) && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); setCategoryFilter('') }}
            className="bs-pt-action"
            style={{
              height: 'var(--bs-control-md)',
              padding: '0 14px',
              borderRadius: 10,
              background: 'transparent',
              border: `1px solid ${T.border}`,
              color: T.textSecondary,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        )}

        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bs-pt-new-btn"
          style={{
            height: 'var(--bs-control-md)',
            padding: '0 var(--bs-space-5)',
            borderRadius: 'var(--bs-radius-md)',
            background: T.accentFill,
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 'var(--bs-text-sm)',
            fontWeight: 600,
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--bs-space-2)',
            boxShadow: '0 4px 14px rgba(var(--bs-accent-rgb), 0.25)',
            transition: 'background var(--bs-dur-1) var(--bs-ease-out)',
          }}
        >
          <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
          New Product
        </button>
      </div>

      {/* Active filter summary */}
      {filtered.length !== allProducts.length && (
        <div style={{
          marginBottom: 16,
          fontSize: 12,
          color: T.textMuted,
        }}>
          Showing <span style={{ color: T.text, fontWeight: 600 }}>{filtered.length}</span> of {allProducts.length} products
        </div>
      )}

      {showCreate && <ProductFormPanel form={newProduct} setForm={setNewProduct} onSave={createProduct} onCancel={() => setShowCreate(false)} saving={creating} title="Create New Product" />}
      {editingId && <ProductFormPanel form={editForm} setForm={setEditForm} onSave={saveEdit} onCancel={() => setEditingId(null)} title="Edit Product" />}

      {loading ? (
        <Loading />
      ) : paged.length === 0 ? (
        <EmptyState text="No products found" />
      ) : (
        <div style={{
          display: 'grid',
          // Same guard. auto-fill rather than auto-fit here, which does not
          // collapse empty tracks — but the failure is the floor, not the
          // collapsing, so the fix is identical.
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))',
          gap: 16,
        }}>
          {paged.map(p => {
            const tint = avatarTintFor(p.name || '?')
            const isHidden = p.status !== 'active'
            const isOOS = p.stock_status !== 'in_stock'
            const lead = primaryPrice(p)

            return (
              <div
                key={p.id}
                className="bs-pt-card"
                style={{
                  background: T.card,
                  // Was `isHidden ? T.border : '#1C1C1F'`. #1C1C1F is a
                  // Marketplace literal that leaked in; it sits close to
                  // --bs-border-default in dark, so the card looked right there
                  // and drew a near-black border on a white card in light. The
                  // hidden-vs-normal distinction is preserved, not "corrected":
                  // hidden keeps the stronger border, normal takes the subtle one.
                  border: `1px solid ${isHidden ? T.border : T.borderSubtle}`,
                  borderRadius: 'var(--bs-radius-lg)',
                  padding: 'var(--bs-space-5)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  position: 'relative',
                  opacity: isHidden ? 0.65 : 1,
                }}
              >
                {/* Featured ribbon.
                    Was 9px, below the 11 floor, and painted the label in plain
                    T.accent on a 12% tint of that same accent — the exact AA
                    failure Phase 6 measured at 3.74:1 in SmallBtn. Reuses
                    --bs-on-tint-mix for the same reason and by the same rule. */}
                {p.featured && (
                  <div style={{
                    position: 'absolute',
                    top: 'var(--bs-space-3)',
                    right: 'var(--bs-space-3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--bs-space-1)',
                    fontSize: 'var(--bs-text-2xs)',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'color-mix(in srgb, var(--bs-accent), var(--bs-on-tint-mix))',
                    background: 'rgba(var(--bs-accent-rgb), 0.12)',
                    border: '1px solid rgba(var(--bs-accent-rgb), 0.3)',
                    padding: '3px var(--bs-space-2)',
                    borderRadius: 'var(--bs-radius-sm)',
                  }}>
                    <StarIcon /> Featured
                  </div>
                )}

                {/* ── HEADER: logo + identity ── */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
                  {p.domain && logoUrl(p.domain) ? (
                    <img
                      src={logoUrl(p.domain)}
                      alt=""
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        background: T.elevated,
                        border: `1px solid ${T.borderSubtle}`,
                        objectFit: 'contain',
                        flexShrink: 0,
                      }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: tint.bg,
                      border: `1px solid ${T.borderSubtle}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      fontWeight: 700,
                      color: tint.fg,
                      flexShrink: 0,
                    }}>
                      {(p.name || '?')[0]?.toUpperCase()}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0, paddingRight: p.featured ? 68 : 0 }}>
                    <div style={{
                      fontSize: 'var(--bs-text-sm)',
                      fontWeight: 700,
                      color: T.text,
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {p.name}
                    </div>
                    {p.category && (
                      <div style={{ fontSize: 12, color: T.accent, marginTop: 3, fontWeight: 500 }}>
                        {sentenceCase(p.category)}
                      </div>
                    )}
                    {p.short_description && (
                      <div style={{
                        fontSize: 12,
                        color: T.textSecondary,
                        marginTop: 4,
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {p.short_description}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── STATUS BADGES ROW ── */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <PillBadge
                   
                    color={p.status === 'active' ? T.success : T.textMuted}
                    tone="soft"
                    dot
                  >
                    {sentenceCase(p.status || 'active')}
                  </PillBadge>
                  <PillBadge
                   
                    color={isOOS ? T.warning : T.success}
                    tone="soft"
                  >
                    {isOOS ? 'Out of stock' : 'In stock'}
                  </PillBadge>
                  {p.billing_type && p.billing_type !== 'subscription' && (
                    <PillBadge color={T.textSecondary} tone="ghost">
                      {sentenceCase(p.billing_type)}
                    </PillBadge>
                  )}
                  {p.tags && (
                    <PillBadge color={T.textSecondary} tone="ghost">
                      {sentenceCase(String(p.tags).split(',')[0])}
                      {String(p.tags).split(',').length > 1 && ` +${String(p.tags).split(',').length - 1}`}
                    </PillBadge>
                  )}
                </div>

                {/* ── PRICE GRID ── */}
                <div>
                  <div style={{ ...metaLabel, marginBottom: 8 }}>Pricing</div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 6,
                    background: T.elevated,
                    border: `1px solid ${T.border}`,
                    borderRadius: 'var(--bs-radius-lg)',
                    padding: 6,
                  }}>
                    {[
                      { l: '1M', v: p.price_1m },
                      { l: '3M', v: p.price_3m },
                      { l: '6M', v: p.price_6m },
                      { l: '1Y', v: p.price_1y },
                    ].map(x => {
                      const isPrimary = x.v === lead && x.v > 0
                      return (
                        <div
                          key={x.l}
                          style={{
                            borderRadius: 'var(--bs-radius-md)',
                            padding: '8px 6px',
                            textAlign: 'center',
                            background: isPrimary ? T.card : 'transparent',
                            border: isPrimary ? `1px solid ${T.border}` : '1px solid transparent',
                          }}
                        >
                          <div style={{
                            fontSize: 'var(--bs-text-2xs)',
                            color: isPrimary ? T.accent : T.textMuted,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            fontWeight: 600,
                          }}>
                            {x.l}
                          </div>
                          <div style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: x.v ? T.text : T.textFaint,
                            fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',
                            marginTop: 3,
                            lineHeight: 1,
                          }}>
                            {x.v ? fmt(x.v) : '—'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* ── ACTIONS ── */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 6,
                  marginTop: 'auto',
                }}>
                  <button
                    onClick={() => startEdit(p)}
                    className="bs-pt-action bs-pt-action-accent"
                    style={actionBtnStyle()}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleStatus(p)}
                    className="bs-pt-action"
                    style={actionBtnStyle()}
                  >
                    {p.status === 'active' ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => toggleStock(p)}
                    className="bs-pt-action"
                    style={actionBtnStyle()}
                  >
                    {p.stock_status === 'in_stock' ? 'Mark OOS' : 'In stock'}
                  </button>
                  <button
                    onClick={() => archiveProduct(p)}
                    className="bs-pt-action bs-pt-action-danger"
                    style={actionBtnStyle()}
                  >
                    Archive
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 24,
          paddingTop: 20,
          borderTop: `1px solid ${T.border}`,
          fontSize: 12,
          color: T.textMuted,
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <span>
            Showing <span style={{ color: T.text, fontWeight: 600 }}>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}
            </span> of {filtered.length}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="bs-pt-page-btn"
              style={refinedPageBtnStyle(page <= 1)}
            >
              ← Prev
            </button>

            <div style={{
              padding: '0 12px',
              fontSize: 12,
              color: T.textSecondary,
            }}>
              Page <span style={{ color: T.text, fontWeight: 600 }}>{page}</span> of {totalPages}
            </div>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="bs-pt-page-btn"
              style={refinedPageBtnStyle(page >= totalPages)}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
