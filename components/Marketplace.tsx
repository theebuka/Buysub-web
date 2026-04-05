'use client';
import { useEffect, useRef, useState } from "react";
import { getProducts, getAutoApplyDiscounts as fetchAutoApplyAPI, validateDiscount as validateDiscountAPI, createWhatsAppOrder, createOrder, initPaystackPayment } from "@/lib/api";
import { PERIODS, TAB_ORDER, FX, CART_STORAGE_KEY, LOGO_DEV_TOKEN, WHATSAPP_NUMBER, Product, CartItem, AppliedDiscount, DiscountRecord, format, discountPct, isInStock, hasCategory, getCategoryList, cartKey, isValidEmail, norm, isItemEligible, getEligibleSubtotal, calcDiscountAmount } from "@/lib/constants";
import { useReferral } from '@/lib/useReferral'

/* ===============================================================
   HOOKS
=============================================================== */

const useWindowWidth = () => {
    const [width, setWidth] = useState(1280) // SSR-safe default
    useEffect(() => {
        setWidth(window.innerWidth)
        const h = () => setWidth(window.innerWidth)
        window.addEventListener("resize", h)
        return () => window.removeEventListener("resize", h)
    }, [])
    return width
}

const { referralCode, affiliateInfo, clearReferral } = useReferral()

/* ===============================================================
   HELPERS
=============================================================== */

const getParam = (key: string, fallback: any) => {
    if (typeof window === "undefined") return fallback;
    return new URLSearchParams(window.location.search).get(key) ?? fallback;
}

const FX_MODE = "static" as string;

/* ===============================================================
   DISCOUNT FETCH HELPERS
=============================================================== */

const fetchDiscountByCode = async (code: string): Promise<any | null> => {
    const res = await validateDiscountAPI(code, [], true);
    if (!res.ok || !res.data?.valid) return null;
    return res.data;
}

const fetchAutoApplyCodes = async (): Promise<any[]> => {
    const res = await fetchAutoApplyAPI();
    if (!res.ok || !res.data?.discounts) return [];
    return res.data.discounts;
}

export default function Marketplace() {
    const width = useWindowWidth()
    const isMobile = width < 640
    const isTablet = width >= 640 && width < 1024
    const gridCols = width < 480 ? 1 : width < 768 ? 2 : width < 1024 ? 3 : 5

    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState<any[]>([])
    const [debouncedQuery, setDebouncedQuery] = useState("")
    const [limit, setLimit] = useState(15)
    const [period, setPeriod] = useState("quarterly")
    const [currency, setCurrency] = useState("NGN")
    const [category, setCategory] = useState("all")
    const [sort, setSort] = useState("alpha")
    const [query, setQuery] = useState("")
    const [minPrice, setMinPrice] = useState("")
    const [maxPrice, setMaxPrice] = useState("")
    const [activeTag, setActiveTag] = useState<string | null>(null)
    const [liveFX, setLiveFX] = useState<Record<string, number> | null>(null)
    const [showFilters, setShowFilters] = useState(false)

    const [cartItems, setCartItems] = useState<Record<string, CartItem>>({})
    const [cartOpen, setCartOpen] = useState(false)
    const drawerRef = useRef<HTMLDivElement>(null)

    // Hydrate from URL params and localStorage after mount (SSR-safe)
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setPeriod(getParam("period", "quarterly"))
        setCurrency(getParam("currency", "NGN"))
        setCategory(getParam("category", "all"))
        setSort(getParam("sort", "alpha"))
        setQuery(getParam("q", ""))
        setMinPrice(getParam("min", ""))
        setMaxPrice(getParam("max", ""))
        setActiveTag(getParam("tag", null))
        try {
            const saved = localStorage.getItem(CART_STORAGE_KEY)
            if (saved) setCartItems(JSON.parse(saved))
        } catch {}
        setMounted(true)
    }, [])

    const [codeInput, setCodeInput] = useState("")
    const [discountLoading, setDiscountLoading] = useState(false)
    const [discountError, setDiscountError] = useState("")
    const [appliedDiscount, setAppliedDiscount] =
        useState<AppliedDiscount | null>(null)
    const [autoDiscount, setAutoDiscount] = useState<AppliedDiscount | null>(
        null
    )
    const [discountInvalidatedMsg, setDiscountInvalidatedMsg] = useState("")
    const [cartReconcileMsg, setCartReconcileMsg] = useState("")

    const [drawerStep, setDrawerStep] = useState<"cart" | "email">("cart")
    const [email, setEmail] = useState("")
    const [emailError, setEmailError] = useState("")

    const fxRate =
        FX_MODE === "live" && liveFX
            ? (liveFX[currency] ?? FX[currency])
            : FX[currency]
    const cartCount = Object.values(cartItems).reduce((s, i) => s + i.qty, 0)
    const activeDiscount = appliedDiscount ?? autoDiscount

    const cartSubtotal = Object.values(cartItems).reduce(
        (s, { product, qty, itemPeriod }) => {
            const price = (product as any)[PERIODS[itemPeriod].field]
            return s + (price ? price * fxRate * qty : 0)
        },
        0
    )

    const eligibleSubtotal = activeDiscount
        ? getEligibleSubtotal(cartItems, activeDiscount, fxRate)
        : 0
    const discountAmount = activeDiscount
        ? calcDiscountAmount(eligibleSubtotal, activeDiscount, fxRate)
        : 0
    const cartTotal = Math.max(0, cartSubtotal - discountAmount)
    const partialDiscount =
        activeDiscount &&
        eligibleSubtotal < cartSubtotal &&
        eligibleSubtotal > 0

    const addToCart = (product: any, itemPeriod: string) => {
        const pid = product.id || product.name
        const key = cartKey(pid, itemPeriod)
        setCartItems((prev) => ({
            ...prev,
            [key]: { product, qty: (prev[key]?.qty ?? 0) + 1, itemPeriod },
        }))
    }

    const removeFromCart = (key: string) => {
        setCartItems((prev) => {
            const next = { ...prev }
            delete next[key]
            return next
        })
    }

    const updateQty = (key: string, qty: number) => {
        if (qty < 1) {
            removeFromCart(key)
            return
        }
        setCartItems((prev) => ({ ...prev, [key]: { ...prev[key], qty } }))
    }

    useEffect(() => {
        if (!mounted) return // Don't save before localStorage is loaded
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems))
        } catch {
            /* storage full */
        }
    }, [cartItems, mounted])

    useEffect(() => {
        const subtotalNGN = cartSubtotal / fxRate
        if (appliedDiscount) {
            const minOrder = (appliedDiscount as any).min_order_ngn || (appliedDiscount as any).minOrderNGN || 0
            if (minOrder > 0 && subtotalNGN < minOrder) {
                setAppliedDiscount(null)
                setCodeInput("")
                setDiscountInvalidatedMsg(
                    `Promo "${appliedDiscount.code}" removed — cart dropped below the minimum order of ${format(minOrder * fxRate, currency)}.`
                )
                return
            }
        }
        if (autoDiscount) {
            const minOrder = (autoDiscount as any).min_order_ngn || (autoDiscount as any).minOrderNGN || 0
            if (minOrder > 0 && subtotalNGN < minOrder) {
                setAutoDiscount(null)
                setDiscountInvalidatedMsg(
                    `Promotion removed — cart dropped below the minimum order of ${format(minOrder * fxRate, currency)}.`
                )
                return
            }
        }
        if (discountInvalidatedMsg) setDiscountInvalidatedMsg("")
    }, [cartSubtotal, fxRate])

    useEffect(() => {
        if (!products.length) return
        fetchAutoApplyCodes()
            .then((codes) => {
                for (const discount of codes) {
                    // The API returns pre-validated auto-apply codes
                    setAutoDiscount({
                        ...discount,
                        isAutoApplied: true,
                    } as any)
                    return
                }
                setAutoDiscount(null)
            })
            .catch(() => {})
    }, [products.length, currency, fxRate])

    const applyDiscountCode = async () => {
        const code = codeInput.trim().toUpperCase()
        if (!code) return
        if (autoDiscount?.is_exclusive) {
            setDiscountError(
                "A site-wide promotion is already applied. No additional codes can be used."
            )
            return
        }
        setDiscountLoading(true)
        setDiscountError("")
        try {
            const items = Object.values(cartItems).map(({ product, qty, itemPeriod }) => {
                const cfg = PERIODS[itemPeriod]
                return {
                    product_id: product.id,
                    product_name: product.name,
                    category: product.category,
                    billing_period: cfg.name,
                    billing_type: product.billing_type,
                    duration_months: cfg.months,
                    unit_price_ngn: (product as any)[cfg.field] || 0,
                    quantity: qty,
                }
            })
            const res = await validateDiscountAPI(code, items, true)
            if (!res.ok || !res.data?.valid) {
                setDiscountError(res.error || res.data?.error || "Code not found or inactive.")
                return
            }
            const d = res.data
            if (d.is_auto_apply) {
                setDiscountError("Code not found or inactive.")
                return
            }
            setAppliedDiscount({
                code: d.code,
                type: d.type,
                value: d.value,
                display: d.display,
                max_discount_ngn: null,
                min_order_ngn: 0,
                included_products: null,
                excluded_products: null,
                included_categories: null,
                excluded_categories: null,
                is_auto_apply: d.is_auto_apply,
                scope: 'site_wide',
                is_exclusive: d.is_exclusive,
                isAutoApplied: false,
            })
            setDiscountError("")
        } catch {
            setDiscountError("Could not validate code. Please try again.")
        } finally {
            setDiscountLoading(false)
        }
    }

    const removeManualDiscount = () => {
        setAppliedDiscount(null)
        setCodeInput("")
        setDiscountError("")
    }
    const handleContinueToEmail = () => {
        setEmailError("")
        setDrawerStep("email")
    }

    const [orderLoading, setOrderLoading] = useState(false)

    const handleSendToWhatsApp = async () => {
        if (!isValidEmail(email)) {
            setEmailError("Please enter a valid email address.")
            return
        }
        setOrderLoading(true)
        try {
            const items = Object.values(cartItems).map(({ product, qty, itemPeriod }) => {
                const cfg = PERIODS[itemPeriod]
                return {
                    product_id: product.id,
                    product_name: product.name,
                    category: product.category,
                    billing_period: cfg.name,
                    billing_type: product.billing_type,
                    duration_months: cfg.months,
                    unit_price_ngn: (product as any)[cfg.field] || 0,
                    quantity: qty,
                }
            })
            const res = await createWhatsAppOrder({
                customer_email: email,
                items,
                discount_code: activeDiscount?.code || undefined,
                currency,
                fx_rate: fxRate,
                payment_method: 'whatsapp',
            })
            if (res.ok && res.data?.whatsapp_url) {
                window.open(res.data.whatsapp_url, "_blank", "noopener,noreferrer")
                // Clear cart after successful order
                setCartItems({})
                closeDrawer()
            } else {
                setEmailError(res.error || "Failed to create order. Please try again.")
            }
        } catch {
            setEmailError("Something went wrong. Please try again.")
        } finally {
            setOrderLoading(false)
        }
    }

    const handlePayWithPaystack = async () => {
        if (!isValidEmail(email)) {
            setEmailError("Please enter a valid email address.")
            return
        }
        setOrderLoading(true)
        setEmailError("")
        try {
            const items = Object.values(cartItems).map(({ product, qty, itemPeriod }) => {
                const cfg = PERIODS[itemPeriod]
                return {
                    product_id: product.id,
                    product_name: product.name,
                    category: product.category,
                    billing_period: cfg.name,
                    billing_type: product.billing_type,
                    duration_months: cfg.months,
                    unit_price_ngn: (product as any)[cfg.field] || 0,
                    quantity: qty,
                }
            })
            // Step 1: Create order
            const orderRes = await createOrder({
                customer_email: email,
                items,
                discount_code: activeDiscount?.code || undefined,
                currency,
                fx_rate: fxRate,
                payment_method: 'paystack',
            })
            if (!orderRes.ok || !orderRes.data?.order_id) {
                setEmailError(orderRes.error || "Failed to create order.")
                return
            }
            // Step 2: Init Paystack payment
            const callbackUrl = `${window.location.origin}/order/verify`
            const payRes = await initPaystackPayment(orderRes.data.order_id, callbackUrl)
            if (!payRes.ok || !payRes.data?.authorization_url) {
                setEmailError(payRes.error || "Failed to initialize payment.")
                return
            }
            // Step 3: Redirect to Paystack
            window.location.href = payRes.data.authorization_url
        } catch {
            setEmailError("Something went wrong. Please try again.")
        } finally {
            setOrderLoading(false)
        }
    }

    useEffect(() => {
        if (!cartOpen) return
        const handler = (e: MouseEvent) => {
            if (
                drawerRef.current &&
                !drawerRef.current.contains(e.target as Node)
            )
                closeDrawer()
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [cartOpen])

    useEffect(() => {
        document.body.style.overflow = cartOpen ? "hidden" : ""
        return () => {
            document.body.style.overflow = ""
        }
    }, [cartOpen])

    const openDrawer = () => {
        setDrawerStep("cart")
        setCartOpen(true)
    }
    const closeDrawer = () => {
        setCartOpen(false)
        setTimeout(() => setDrawerStep("cart"), 300)
    }

    const PRODUCT_CACHE_KEY = "bs_products_v2"
    const PRODUCT_CACHE_TTL = 10 * 60 * 1000

    useEffect(() => {
        let cancelled = false

        const loadProducts = async () => {
            // Check sessionStorage cache first
            try {
                const raw = sessionStorage.getItem(PRODUCT_CACHE_KEY)
                if (raw) {
                    const { data, ts } = JSON.parse(raw)
                    if (Date.now() - ts < PRODUCT_CACHE_TTL) {
                        if (!cancelled) {
                            setProducts(data)
                            setLoading(false)
                        }
                        return
                    }
                }
            } catch {
                /* storage unavailable */
            }

            // Fetch from API
            const res = await getProducts({ limit: 500 })
            if (cancelled || !res.ok || !res.data) return

            const all = res.data

            // Save to cache
            try {
                sessionStorage.setItem(
                    PRODUCT_CACHE_KEY,
                    JSON.stringify({ data: all, ts: Date.now() })
                )
            } catch { /* storage full */ }

            setProducts(all)
            setLoading(false)

            // Cart reconciliation
            const freshById: Record<string, any> = {}
            all.forEach((p: any) => { freshById[p.id] = p })
            setCartItems((prev) => {
                const next: Record<string, CartItem> = {}
                const removed: string[] = []
                const updated: string[] = []
                Object.entries(prev).forEach(([key, item]) => {
                    const freshProduct = freshById[item.product.id]
                    if (!freshProduct) {
                        removed.push(item.product.name)
                        return
                    }
                    const periodField = PERIODS[item.itemPeriod]?.field
                    const freshPrice = (freshProduct as any)[periodField]
                    const oldPrice = (item.product as any)[periodField]
                    if (freshPrice !== oldPrice)
                        updated.push(item.product.name)
                    next[key] = { ...item, product: freshProduct }
                })
                const msgs: string[] = []
                if (removed.length)
                    msgs.push(
                        `${removed.join(", ")} ${removed.length === 1 ? "is" : "are"} no longer available and ${removed.length === 1 ? "was" : "were"} removed from your cart.`
                    )
                if (updated.length)
                    msgs.push(
                        `Prices updated for: ${updated.join(", ")}.`
                    )
                if (msgs.length) setCartReconcileMsg(msgs.join(" "))
                return next
            })
        }

        loadProducts()
        return () => { cancelled = true }
    }, [])

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedQuery(query)
            setLimit(15)
        }, 800)
        return () => clearTimeout(t)
    }, [query])

    useEffect(() => {
        if (FX_MODE !== "live") return
        const FX_MARGIN_PERCENT = 10
        fetch("https://api.exchangerate.host/latest?base=NGN")
            .then((r) => r.json())
            .then((d) => {
                const m = (r: number) => r * (1 - FX_MARGIN_PERCENT / 100)
                setLiveFX({
                    USD: m(d.rates.USD),
                    GBP: m(d.rates.GBP),
                    CAD: m(d.rates.CAD),
                })
            })
            .catch(() => setLiveFX(null))
    }, [])

    useEffect(() => {
        const p = new URLSearchParams()
        p.set("period", period)
        p.set("currency", currency)
        p.set("category", category)
        p.set("sort", sort)
        if (query) p.set("q", query)
        if (minPrice) p.set("min", minPrice)
        if (maxPrice) p.set("max", maxPrice)
        if (activeTag) p.set("tag", activeTag)
        window.history.replaceState(null, "", `?${p.toString()}`)
    }, [period, currency, category, sort, query, minPrice, maxPrice, activeTag])

    const categories = (() => {
        const found = Array.from(
            new Set(products.flatMap(getCategoryList))
        ) as string[]
        const ordered = ["all"]
        TAB_ORDER.forEach((c) => {
            if (found.includes(c)) ordered.push(c)
        })
        ordered.push(...found.filter((c) => !TAB_ORDER.includes(c)))
        return ordered
    })()

    const categoryCounts = products.reduce(
        (acc, p) => {
            const cats = getCategoryList(p)
            if (!cats.length)
                acc["Uncategorized"] = (acc["Uncategorized"] || 0) + 1
            else
                cats.forEach((c: string) => {
                    acc[c] = (acc[c] || 0) + 1
                })
            return acc
        },
        {} as Record<string, number>
    )

    const cfg = PERIODS[period]

    const filtered = products
        .filter((p) => hasCategory(p, category))
        .filter((p) =>
            norm(
                `${p.name} ${p.description} ${getCategoryList(p).join(" ")}`
            ).includes(norm(debouncedQuery))
        )
        .filter((p) => {
            if (!activeTag || !p.tags) return !activeTag
            return String(p.tags)
                .split(",")
                .map((t: string) => t.trim().toLowerCase())
                .includes(activeTag.toLowerCase())
        })
        .filter((p) => {
            const price = (p as any)[cfg.field]
            if (!price) return true
            if (minPrice && price < Number(minPrice)) return false
            if (maxPrice && price > Number(maxPrice)) return false
            return true
        })
        .sort((a, b) => {
            if (sort === "alpha") {
                return (a.name || "").localeCompare(b.name || "")
            }
            const pa = (a as any)[cfg.field] ?? Infinity,
                pb = (b as any)[cfg.field] ?? Infinity
            const priceDiff = sort === "asc" ? pa - pb : pb - pa
            if (priceDiff !== 0) return priceDiff
            return (a.name || "").localeCompare(b.name || "")
        })

    const visible = filtered.slice(0, limit)

    const ctrlH = isMobile ? 48 : 42
    const ctrlBase: any = {
        padding: "0 16px",
        borderRadius: 10,
        background: "var(--bs-bg-input)",
        border: "1px solid var(--bs-border-default)",
        color: "var(--bs-text-primary)",
        textAlign: "left" as const,
        height: ctrlH,
        boxSizing: "border-box" as const,
        fontSize: 14,
        display: "flex",
        alignItems: "center",
    }

    return (
        <div
            style={{
                color: "var(--bs-text-primary)",
                fontFamily: "Inter",
                background: "var(--bs-bg-base)",
            }}
        >
            <style>{`
                @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.5} }
                @keyframes slideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
                @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
                .hide-scrollbar::-webkit-scrollbar { display:none }
                .hide-scrollbar { -ms-overflow-style:none; scrollbar-width:none }
                .mkt-filter-panel { overflow:hidden; max-height:0; transition:max-height .25s ease,opacity .2s ease; opacity:0 }
                .mkt-filter-panel.open { max-height:120px; opacity:1 }
                .cart-add-btn:hover:not(:disabled) { background:#6B4EE6 !important }
                .cart-qty-btn:hover  { background:var(--bs-bg-muted) !important }
                .mkt-card { transition:border-color .15s }
                .mkt-card:hover { border-color:var(--bs-border-strong) !important }
                .discount-input:focus { outline:none; border-color:#7C5CFF !important }
                .email-input:focus { outline:none; border-color:#7C5CFF !important }
                .wa-btn:hover { background:#1EBF5A !important }
            `}</style>

            <div style={S.stickyControls}>
                {!isMobile && (
                    <div style={S.topBarRow}>
                        <div style={S.topLeftGroup}>
                            <div
                                style={{
                                    position: "relative",
                                    width: isTablet ? 180 : 220,
                                }}
                            >
                                <input
                                    placeholder="Search products..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    style={{
                                        ...ctrlBase,
                                        width: "100%",
                                        paddingRight: 36,
                                    }}
                                />
                                {query && (
                                    <button
                                        onClick={() => setQuery("")}
                                        style={S.clearBtn}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                            <div style={{ ...S.segContainer, height: ctrlH }}>
                                {Object.keys(PERIODS).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPeriod(p)}
                                        style={{
                                            ...S.segBtn,
                                            height: ctrlH - 8,
                                            background:
                                                period === p
                                                    ? "#7C5CFF"
                                                    : "transparent",
                                            color:
                                                period === p
                                                    ? "#fff"
                                                    : "var(--bs-text-primary)",
                                        }}
                                    >
                                        {PERIODS[p].name}
                                    </button>
                                ))}
                            </div>
                            <div style={{ ...S.segContainer, height: ctrlH }}>
                                {Object.keys(FX).map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setCurrency(c)}
                                        style={{
                                            ...S.segBtn,
                                            height: ctrlH - 8,
                                            background:
                                                currency === c
                                                    ? "var(--bs-bg-muted)"
                                                    : "transparent",
                                            color: "var(--bs-text-primary)",
                                        }}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div style={S.topRightGroup}>
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value)}
                                style={{
                                    ...ctrlBase,
                                    paddingLeft: 16,
                                    color: "var(--bs-text-primary)",
                                }}
                            >
                                <option value="alpha">Alphabetical</option>
                                <option value="asc">Price: Low to High</option>
                                <option value="desc">Price: High to Low</option>
                            </select>
                            <input
                                placeholder="Min ₦"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                style={{ ...ctrlBase, width: 90 }}
                            />
                            <input
                                placeholder="Max ₦"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                style={{ ...ctrlBase, width: 90 }}
                            />
                        </div>
                    </div>
                )}

                {isMobile && (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                        }}
                    >
                        <div style={{ display: "flex", gap: 8 }}>
                            <div style={{ position: "relative", flex: 1 }}>
                                <input
                                    placeholder="Search products..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    style={{
                                        ...ctrlBase,
                                        width: "100%",
                                        paddingRight: 36,
                                        boxSizing: "border-box",
                                    }}
                                />
                                {query && (
                                    <button
                                        onClick={() => setQuery("")}
                                        style={S.clearBtn}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setShowFilters((v) => !v)}
                                style={{
                                    height: ctrlH,
                                    padding: "0 14px",
                                    borderRadius: 10,
                                    flexShrink: 0,
                                    background: showFilters
                                        ? "#7C5CFF"
                                        : "var(--bs-bg-input)",
                                    border: `1px solid ${showFilters ? "#7C5CFF" : "var(--bs-border-default)"}`,
                                    color: showFilters
                                        ? "#fff"
                                        : "var(--bs-text-primary)",
                                    cursor: "pointer",
                                    fontSize: 13,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                }}
                            >
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                >
                                    <line x1="4" y1="6" x2="20" y2="6" />
                                    <line x1="8" y1="12" x2="16" y2="12" />
                                    <line x1="11" y1="18" x2="13" y2="18" />
                                </svg>
                                {minPrice || maxPrice ? "Filters •" : "Filters"}
                            </button>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                background: "var(--bs-bg-input)",
                                border: "1px solid var(--bs-border-default)",
                                borderRadius: 10,
                                padding: 4,
                                gap: 4,
                                height: ctrlH,
                                boxSizing: "border-box",
                                alignItems: "center",
                            }}
                        >
                            {Object.keys(PERIODS).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    style={{
                                        flex: 1,
                                        height: ctrlH - 8,
                                        borderRadius: 8,
                                        background:
                                            period === p
                                                ? "#7C5CFF"
                                                : "transparent",
                                        color: "#fff",
                                        border: "none",
                                        cursor: "pointer",
                                        fontSize: 13,
                                        fontWeight: period === p ? 600 : 400,
                                    }}
                                >
                                    {PERIODS[p].name}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: "flex", gap: 8, minWidth: 0 }}>
                            <div
                                style={{
                                    display: "flex",
                                    flexShrink: 0,
                                    background: "var(--bs-bg-input)",
                                    border: "1px solid var(--bs-border-default)",
                                    borderRadius: 10,
                                    padding: 4,
                                    gap: 2,
                                    height: ctrlH,
                                    boxSizing: "border-box",
                                    alignItems: "center",
                                }}
                            >
                                {Object.keys(FX).map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setCurrency(c)}
                                        style={{
                                            height: ctrlH - 8,
                                            padding: "0 9px",
                                            borderRadius: 8,
                                            background:
                                                currency === c
                                                    ? "var(--bs-border-default)"
                                                    : "transparent",
                                            color: "#fff",
                                            border: "none",
                                            cursor: "pointer",
                                            fontSize: 13,
                                            fontWeight:
                                                currency === c ? 600 : 400,
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value)}
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    height: ctrlH,
                                    padding: "0 10px",
                                    borderRadius: 10,
                                    background: "var(--bs-bg-input)",
                                    border: "1px solid var(--bs-border-default)",
                                    color: "var(--bs-text-primary)",
                                    fontSize: 13,
                                    boxSizing: "border-box",
                                }}
                            >
                                <option value="alpha">Alphabetical</option>
                                <option value="asc">Price: Low to High</option>
                                <option value="desc">Price: High to Low</option>
                            </select>
                        </div>
                        <div
                            className={`mkt-filter-panel${showFilters ? " open" : ""}`}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    gap: 8,
                                    paddingTop: 4,
                                }}
                            >
                                <input
                                    placeholder="Min price ₦"
                                    value={minPrice}
                                    onChange={(e) =>
                                        setMinPrice(e.target.value)
                                    }
                                    style={{
                                        flex: 1,
                                        height: ctrlH,
                                        padding: "0 14px",
                                        borderRadius: 10,
                                        background: "var(--bs-bg-input)",
                                        border: "1px solid var(--bs-border-default)",
                                        color: "var(--bs-text-primary)",
                                        fontSize: 13,
                                        boxSizing: "border-box",
                                    }}
                                />
                                <input
                                    placeholder="Max price ₦"
                                    value={maxPrice}
                                    onChange={(e) =>
                                        setMaxPrice(e.target.value)
                                    }
                                    style={{
                                        flex: 1,
                                        height: ctrlH,
                                        padding: "0 14px",
                                        borderRadius: 10,
                                        background: "var(--bs-bg-input)",
                                        border: "1px solid var(--bs-border-default)",
                                        color: "var(--bs-text-primary)",
                                        fontSize: 13,
                                        boxSizing: "border-box",
                                    }}
                                />
                                {(minPrice || maxPrice) && (
                                    <button
                                        onClick={() => {
                                            setMinPrice("")
                                            setMaxPrice("")
                                        }}
                                        style={{
                                            height: ctrlH,
                                            padding: "0 14px",
                                            borderRadius: 10,
                                            background: "transparent",
                                            border: "1px solid var(--bs-border-default)",
                                            color: "#7C5CFF",
                                            cursor: "pointer",
                                            fontSize: 13,
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div
                    className="hide-scrollbar"
                    style={{
                        display: "flex",
                        gap: 6,
                        overflowX: "auto",
                        paddingBottom: 4,
                        marginTop: 16,
                    }}
                >
                    {categories.map((c) => (
                        <button
                            key={c}
                            onClick={() => {
                                setCategory(c)
                                setLimit(15)
                            }}
                            style={{
                                height: isMobile ? 44 : 36,
                                padding: isMobile ? "0 16px" : "0 12px",
                                borderRadius: 999,
                                background:
                                    category === c
                                        ? "#7C5CFF"
                                        : "var(--bs-bg-elevated)",
                                color:
                                    category === c
                                        ? "#fff"
                                        : "var(--bs-text-primary)",
                                border: "none",
                                whiteSpace: "nowrap",
                                textTransform: "capitalize",
                                cursor: "pointer",
                                fontSize: 13,
                                display: "flex",
                                alignItems: "center",
                                flexShrink: 0,
                            }}
                        >
                            {c}{" "}
                            <span style={{ opacity: 0.6, marginLeft: 4 }}>
                                (
                                {c === "all"
                                    ? products.length
                                    : categoryCounts[c] || 0}
                                )
                            </span>
                        </button>
                    ))}
                </div>

                {activeTag && (
                    <div
                        style={{
                            marginTop: 10,
                            fontSize: 12,
                            color: "var(--bs-text-secondary)",
                        }}
                    >
                        Tag:{" "}
                        <strong style={{ color: "var(--bs-text-primary)" }}>
                            {activeTag}
                        </strong>
                        <button
                            onClick={() => setActiveTag(null)}
                            style={{
                                marginLeft: 8,
                                background: "transparent",
                                border: "none",
                                color: "#7C5CFF",
                                cursor: "pointer",
                                fontSize: 12,
                                padding: "4px 0",
                            }}
                        >
                            clear
                        </button>
                    </div>
                )}
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                    gap: isMobile ? 12 : 16,
                }}
            >
                {loading &&
                    Array.from({ length: gridCols * 2 }).map((_, i) => (
                        <div
                            key={i}
                            style={{
                                ...cardStyle(isMobile),
                                animation: "pulse 1.5s ease-in-out infinite",
                            }}
                        >
                            <div style={S.topRow}>
                                <div style={S.skelIcon} />
                                <div style={{ flex: 1 }}>
                                    <div style={S.skelLineLg} />
                                    <div style={S.skelLineSm} />
                                </div>
                            </div>
                            <div style={S.skelPara} />
                            <div style={S.skelPara} />
                            <div style={S.bottomBlock}>
                                <div>
                                    <div style={S.skelPrice} />
                                    <div style={S.skelSmall} />
                                </div>
                                <div style={S.skelBadge} />
                            </div>
                        </div>
                    ))}

                {!loading &&
                    visible.map((p) => {
                        const price = (p as any)[cfg.field]
                        const monthly = p.price_1m
                        const discount = discountPct(monthly, price, cfg.months)
                        const isOutright = p.billing_type === "one_time"
                        const pid = p.id || p.name
                        const key = cartKey(pid, period)
                        const inCart = !!cartItems[key]
                        const cartQty = cartItems[key]?.qty ?? 0
                        const inStock = isInStock(p.stock_status)

                        return (
                            <div
                                key={pid + period}
                                className="mkt-card"
                                style={{
                                    ...cardStyle(isMobile),
                                    border: "1px solid #1C1C1F",
                                }}
                            >
                                {/* ── TOP GROUP: grows to fill space, anchors bottom content ── */}
                                <div
                                    style={{
                                        flex: 1,
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: isMobile ? 10 : 14,
                                    }}
                                >
                                    <div style={S.topRow}>
                                        <ProductLogo product={p} />
                                        <div style={S.productRow}>
                                            <div
                                                style={{
                                                    ...S.productName,
                                                    fontSize: isMobile
                                                        ? 14
                                                        : 16,
                                                }}
                                            >
                                                {p.name}
                                            </div>
                                            <div style={S.metaRow}>
                                                <span style={S.category}>
                                                    {p.category
                                                        ? p.category.split(",")[0].trim()
                                                        : "Uncategorized"}
                                                </span>
                                                {p.tags && (
                                                    <>
                                                        <span style={S.metaSep}>
                                                            •
                                                        </span>
                                                        <div style={S.tagList}>
                                                            {String(p.tags)
                                                                .split(",")
                                                                .map(
                                                                    (
                                                                        rawTag: string
                                                                    ) => {
                                                                        const tag =
                                                                            rawTag.trim()
                                                                        return (
                                                                            <span
                                                                                key={
                                                                                    tag
                                                                                }
                                                                                title={
                                                                                    tag
                                                                                }
                                                                                style={{
                                                                                    ...S.tag,
                                                                                    textDecoration:
                                                                                        activeTag?.toLowerCase() ===
                                                                                        tag.toLowerCase()
                                                                                            ? "underline"
                                                                                            : "none",
                                                                                }}
                                                                                onClick={() =>
                                                                                    setActiveTag(
                                                                                        (
                                                                                            t
                                                                                        ) =>
                                                                                            t?.toLowerCase() ===
                                                                                            tag.toLowerCase()
                                                                                                ? null
                                                                                                : tag
                                                                                    )
                                                                                }
                                                                            >
                                                                                {
                                                                                    tag
                                                                                }
                                                                            </span>
                                                                        )
                                                                    }
                                                                )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            ...S.description,
                                            WebkitLineClamp: isTablet
                                                ? 2
                                                : undefined,
                                            display: isTablet
                                                ? "-webkit-box"
                                                : "block",
                                            WebkitBoxOrient: isTablet
                                                ? ("vertical" as const)
                                                : undefined,
                                            overflow: isTablet
                                                ? "hidden"
                                                : undefined,
                                        }}
                                    >
                                        {p.description}
                                    </div>
                                </div>

                                {/* ── BOTTOM GROUP: always at card bottom ── */}
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: isMobile ? 10 : 14,
                                    }}
                                >
                                    <div style={S.bottomBlock}>
                                        <div style={S.priceBlock}>
                                            <div
                                                style={{
                                                    ...S.price,
                                                    fontSize: isMobile
                                                        ? 17
                                                        : 20,
                                                }}
                                            >
                                                {format(
                                                    price * fxRate,
                                                    currency
                                                )}{" "}
                                                {!isOutright && (
                                                    <span style={S.periodLabel}>
                                                        {cfg.label}
                                                    </span>
                                                )}
                                            </div>
                                            {!isOutright && discount && (
                                                <div style={S.discountRow}>
                                                    <span style={S.strike}>
                                                        {format(
                                                            monthly *
                                                                cfg.months *
                                                                fxRate,
                                                            currency
                                                        )}
                                                    </span>
                                                    <span
                                                        style={S.discountBadge}
                                                    >
                                                        Save {discount}%
                                                    </span>
                                                </div>
                                            )}
                                            {isOutright && (
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        color: "var(--bs-text-secondary)",
                                                    }}
                                                >
                                                    One-time
                                                </div>
                                            )}
                                        </div>
                                        <div
                                            style={{
                                                ...S.badge,
                                                background: inStock
                                                    ? "rgba(var(--bs-success-rgb), 0.15)"
                                                    : "rgba(var(--bs-muted-rgb), 0.2)",
                                                color: inStock
                                                    ? "var(--bs-success)"
                                                    : "var(--bs-text-secondary)",
                                                padding: isMobile
                                                    ? "4px 8px"
                                                    : "6px 12px",
                                                fontSize: isMobile ? 11 : 12,
                                            }}
                                        >
                                            {inStock
                                                ? "In stock"
                                                : "Out of stock"}
                                        </div>
                                    </div>

                                    {!inCart ? (
                                        <button
                                            className="cart-add-btn"
                                            onClick={() => addToCart(p, period)}
                                            disabled={!inStock}
                                            style={{
                                                width: "100%",
                                                height: 40,
                                                borderRadius: 10,
                                                background: inStock
                                                    ? "#7C5CFF"
                                                    : "var(--bs-bg-muted)",
                                                border: "none",
                                                color: inStock
                                                    ? "#fff"
                                                    : "var(--bs-text-faint)",
                                                cursor: inStock
                                                    ? "pointer"
                                                    : "not-allowed",
                                                fontSize: 13,
                                                fontWeight: 600,
                                                transition: "background .15s",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: 6,
                                            }}
                                        >
                                            <CartIcon />
                                            {inStock
                                                ? `Add to cart · ${cfg.name}`
                                                : "Out of stock"}
                                        </button>
                                    ) : (
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                                height: 40,
                                            }}
                                        >
                                            <QtyBtn
                                                onClick={() =>
                                                    updateQty(key, cartQty - 1)
                                                }
                                            >
                                                −
                                            </QtyBtn>
                                            <span
                                                style={{
                                                    flex: 1,
                                                    textAlign: "center",
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    color: "var(--bs-success)",
                                                }}
                                            >
                                                {cartQty} × {cfg.name}
                                            </span>
                                            <QtyBtn
                                                onClick={() =>
                                                    updateQty(key, cartQty + 1)
                                                }
                                            >
                                                +
                                            </QtyBtn>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
            </div>

            {visible.length < filtered.length && (
                <div style={{ marginTop: 32, textAlign: "center" }}>
                    <button
                        onClick={() => setLimit((l) => l + 15)}
                        style={{
                            height: isMobile ? 48 : 42,
                            padding: "0 24px",
                            borderRadius: 10,
                            background: "var(--bs-bg-input)",
                            border: "1px solid var(--bs-border-default)",
                            color: "var(--bs-text-primary)",
                            cursor: "pointer",
                            fontSize: 14,
                        }}
                    >
                        Load more ({filtered.length - visible.length} remaining)
                    </button>
                </div>
            )}

            {cartCount > 0 && (
                <button
                    onClick={openDrawer}
                    style={{
                        position: "fixed",
                        bottom: isMobile ? 20 : 32,
                        right: isMobile ? 16 : 32,
                        zIndex: 100,
                        height: 52,
                        padding: "0 22px",
                        borderRadius: 999,
                        background: "#7C5CFF",
                        border: "none",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: 15,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        boxShadow: "0 8px 32px rgba(124,92,255,0.45)",
                    }}
                >
                    <CartIcon size={18} />
                    View cart
                    <span
                        style={{
                            background: "rgba(255,255,255,0.25)",
                            borderRadius: 999,
                            padding: "2px 9px",
                            fontSize: 13,
                            fontWeight: 700,
                        }}
                    >
                        {cartCount}
                    </span>
                </button>
            )}

            {cartOpen && (
                <>
                    <div
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0,0,0,0.65)",
                            zIndex: 150,
                            animation: "fadeIn .2s ease",
                        }}
                    />
                    <div
                        ref={drawerRef}
                        style={{
                            position: "fixed",
                            top: 0,
                            right: 0,
                            bottom: 0,
                            width: isMobile ? "100vw" : 440,
                            background: "var(--bs-bg-card)",
                            borderLeft: "1px solid #1C1C1F",
                            zIndex: 200,
                            display: "flex",
                            flexDirection: "column",
                            animation: "slideIn .25s cubic-bezier(.4,0,.2,1)",
                        }}
                    >
                        <div
                            style={{
                                padding: "20px 24px",
                                borderBottom: "1px solid #1C1C1F",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                flexShrink: 0,
                            }}
                        >
                            <div>
                                {drawerStep === "email" && (
                                    <button
                                        onClick={() => setDrawerStep("cart")}
                                        style={{
                                            background: "transparent",
                                            border: "none",
                                            color: "#7C5CFF",
                                            cursor: "pointer",
                                            fontSize: 13,
                                            padding: "0 0 6px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 4,
                                        }}
                                    >
                                        ← Back to cart
                                    </button>
                                )}
                                <div style={{ fontSize: 18, fontWeight: 700 }}>
                                    {drawerStep === "cart"
                                        ? "Your cart"
                                        : "Almost there"}
                                </div>
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: "var(--bs-text-secondary)",
                                        marginTop: 3,
                                    }}
                                >
                                    {drawerStep === "cart"
                                        ? `${cartCount} item${cartCount !== 1 ? "s" : ""} · ${currency}`
                                        : "Enter your email to confirm the order"}
                                </div>
                            </div>
                            <button
                                onClick={closeDrawer}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 8,
                                    background: "var(--bs-bg-input)",
                                    border: "1px solid var(--bs-border-default)",
                                    color: "var(--bs-text-secondary)",
                                    cursor: "pointer",
                                    fontSize: 20,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {drawerStep === "cart" && (
                            <>
                                <div
                                    className="hide-scrollbar"
                                    style={{
                                        flex: 1,
                                        overflowY: "auto",
                                        padding: "16px 24px",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 10,
                                    }}
                                >
                                    {cartReconcileMsg && (
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "flex-start",
                                                gap: 10,
                                                background:
                                                    "rgba(var(--bs-warning-rgb), 0.07)",
                                                border: "1px solid rgba(250,204,21,0.2)",
                                                borderRadius: 10,
                                                padding: "10px 14px",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: 14,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                ℹ️
                                            </span>
                                            <div
                                                style={{
                                                    fontSize: 12,
                                                    color: "var(--bs-warning)",
                                                    lineHeight: 1.5,
                                                    flex: 1,
                                                }}
                                            >
                                                {cartReconcileMsg}
                                            </div>
                                            <button
                                                onClick={() =>
                                                    setCartReconcileMsg("")
                                                }
                                                style={{
                                                    background: "transparent",
                                                    border: "none",
                                                    color: "var(--bs-text-muted)",
                                                    cursor: "pointer",
                                                    fontSize: 16,
                                                    lineHeight: 1,
                                                    padding: 0,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}

                                    {Object.entries(cartItems).map(
                                        ([
                                            key,
                                            { product, qty, itemPeriod },
                                        ]) => {
                                            const itemCfg = PERIODS[itemPeriod]
                                            const linePrice =
                                                (product as any)[itemCfg.field]
                                            const lineTotal = linePrice
                                                ? linePrice * fxRate * qty
                                                : 0
                                            const isOutright =
                                                product.billing_type ===
                                                "one_time"
                                            const eligible = activeDiscount
                                                ? isItemEligible(
                                                      {
                                                          product,
                                                          qty,
                                                          itemPeriod,
                                                      },
                                                      activeDiscount
                                                  )
                                                : true
                                            return (
                                                <div
                                                    key={key}
                                                    style={{
                                                        background:
                                                            "var(--bs-bg-elevated)",
                                                        borderRadius: 14,
                                                        padding: "14px 16px",
                                                        display: "flex",
                                                        gap: 12,
                                                        alignItems: "center",
                                                        opacity:
                                                            !eligible &&
                                                            activeDiscount
                                                                ? 0.7
                                                                : 1,
                                                    }}
                                                >
                                                    {product.image_url ? (
                                                        <img
                                                            src={
                                                                product.image_url
                                                            }
                                                            style={{
                                                                width: 44,
                                                                height: 44,
                                                                borderRadius: 10,
                                                                flexShrink: 0,
                                                                objectFit:
                                                                    "contain",
                                                                background:
                                                                    "var(--bs-bg-elevated)",
                                                                padding: 4,
                                                                boxSizing:
                                                                    "border-box",
                                                            }}
                                                            alt=""
                                                        />
                                                    ) : (
                                                        <ProductLogo
                                                            product={product}
                                                            size={44}
                                                        />
                                                    )}
                                                    <div
                                                        style={{
                                                            flex: 1,
                                                            minWidth: 0,
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                fontSize: 13,
                                                                fontWeight: 600,
                                                                marginBottom: 3,
                                                                overflow:
                                                                    "hidden",
                                                                textOverflow:
                                                                    "ellipsis",
                                                                whiteSpace:
                                                                    "nowrap",
                                                            }}
                                                        >
                                                            {
                                                                product.name
                                                            }
                                                        </div>
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                gap: 6,
                                                                alignItems:
                                                                    "center",
                                                                flexWrap:
                                                                    "wrap",
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    fontSize: 11,
                                                                    background:
                                                                        "var(--bs-bg-muted)",
                                                                    borderRadius: 4,
                                                                    padding:
                                                                        "2px 6px",
                                                                    color: "var(--bs-text-secondary)",
                                                                }}
                                                            >
                                                                {itemCfg.name}
                                                            </span>
                                                            <span
                                                                style={{
                                                                    fontSize: 12,
                                                                    color: "var(--bs-text-secondary)",
                                                                }}
                                                            >
                                                                {format(
                                                                    linePrice *
                                                                        fxRate,
                                                                    currency
                                                                )}
                                                                {!isOutright &&
                                                                    ` ${itemCfg.label}`}
                                                            </span>
                                                            {!eligible &&
                                                                activeDiscount && (
                                                                    <span
                                                                        style={{
                                                                            fontSize: 10,
                                                                            color: "var(--bs-text-muted)",
                                                                            fontStyle:
                                                                                "italic",
                                                                        }}
                                                                    >
                                                                        promo
                                                                        not
                                                                        applicable
                                                                    </span>
                                                                )}
                                                        </div>
                                                    </div>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            gap: 6,
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <DrawerQtyBtn
                                                            onClick={() =>
                                                                updateQty(
                                                                    key,
                                                                    qty - 1
                                                                )
                                                            }
                                                        >
                                                            −
                                                        </DrawerQtyBtn>
                                                        <span
                                                            style={{
                                                                width: 20,
                                                                textAlign:
                                                                    "center",
                                                                fontSize: 13,
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            {qty}
                                                        </span>
                                                        <DrawerQtyBtn
                                                            onClick={() =>
                                                                updateQty(
                                                                    key,
                                                                    qty + 1
                                                                )
                                                            }
                                                        >
                                                            +
                                                        </DrawerQtyBtn>
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: 14,
                                                            fontWeight: 700,
                                                            marginLeft: 4,
                                                            flexShrink: 0,
                                                            minWidth: 68,
                                                            textAlign: "right",
                                                        }}
                                                    >
                                                        {format(
                                                            lineTotal,
                                                            currency
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        }
                                    )}
                                </div>

                                <div
                                    style={{
                                        padding: "20px 24px",
                                        borderTop: "1px solid #1C1C1F",
                                        flexShrink: 0,
                                    }}
                                >
                                    {discountInvalidatedMsg && (
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "flex-start",
                                                gap: 10,
                                                background:
                                                    "rgba(var(--bs-error-rgb), 0.08)",
                                                border: "1px solid rgba(248,113,113,0.2)",
                                                borderRadius: 10,
                                                padding: "10px 14px",
                                                marginBottom: 14,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: 14,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                ⚠️
                                            </span>
                                            <div
                                                style={{
                                                    fontSize: 12,
                                                    color: "#FCA5A5",
                                                    lineHeight: 1.5,
                                                }}
                                            >
                                                {discountInvalidatedMsg}
                                            </div>
                                            <button
                                                onClick={() =>
                                                    setDiscountInvalidatedMsg(
                                                        ""
                                                    )
                                                }
                                                style={{
                                                    background: "transparent",
                                                    border: "none",
                                                    color: "var(--bs-text-muted)",
                                                    cursor: "pointer",
                                                    fontSize: 16,
                                                    lineHeight: 1,
                                                    padding: 0,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}

                                    {autoDiscount?.is_exclusive ? (
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                background:
                                                    "rgba(var(--bs-accent-rgb), 0.08)",
                                                border: "1px solid rgba(124,92,255,0.25)",
                                                borderRadius: 10,
                                                padding: "10px 14px",
                                                marginBottom: 16,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                }}
                                            >
                                                <span style={{ fontSize: 14 }}>
                                                    🎉
                                                </span>
                                                <div>
                                                    <div
                                                        style={{
                                                            fontSize: 13,
                                                            fontWeight: 600,
                                                            color: "var(--bs-text-primary)",
                                                        }}
                                                    >
                                                        Promotion applied
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: 12,
                                                            color: "var(--bs-text-secondary)",
                                                        }}
                                                    >
                                                        {autoDiscount.display}
                                                        {partialDiscount &&
                                                            " · selected items"}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : !appliedDiscount ? (
                                        <div style={{ marginBottom: 16 }}>
                                            {autoDiscount && (
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 8,
                                                        background:
                                                            "rgba(var(--bs-success-rgb), 0.06)",
                                                        border: "1px solid rgba(34,197,94,0.15)",
                                                        borderRadius: 8,
                                                        padding: "8px 12px",
                                                        marginBottom: 10,
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: 12,
                                                            color: "var(--bs-success)",
                                                        }}
                                                    >
                                                        🎉{" "}
                                                        {autoDiscount.display}{" "}
                                                        auto-applied
                                                        {partialDiscount &&
                                                            " · selected items"}
                                                    </span>
                                                </div>
                                            )}
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: 8,
                                                }}
                                            >
                                                <input
                                                    className="discount-input"
                                                    placeholder="Promo code"
                                                    value={codeInput}
                                                    onChange={(e) => {
                                                        setCodeInput(
                                                            e.target.value.toUpperCase()
                                                        )
                                                        setDiscountError("")
                                                    }}
                                                    onKeyDown={(e) =>
                                                        e.key === "Enter" &&
                                                        applyDiscountCode()
                                                    }
                                                    style={{
                                                        flex: 1,
                                                        height: 40,
                                                        padding: "0 14px",
                                                        borderRadius: 10,
                                                        background:
                                                            "var(--bs-bg-input)",
                                                        border: `1px solid ${discountError ? "var(--bs-error)" : "var(--bs-border-default)"}`,
                                                        color: "var(--bs-text-primary)",
                                                        fontSize: 13,
                                                        boxSizing: "border-box",
                                                        letterSpacing: "0.05em",
                                                    }}
                                                />
                                                <button
                                                    onClick={applyDiscountCode}
                                                    disabled={
                                                        discountLoading ||
                                                        !codeInput.trim()
                                                    }
                                                    style={{
                                                        height: 40,
                                                        padding: "0 16px",
                                                        borderRadius: 10,
                                                        background:
                                                            codeInput.trim()
                                                                ? "#7C5CFF"
                                                                : "var(--bs-bg-muted)",
                                                        border: "none",
                                                        color: codeInput.trim()
                                                            ? "#fff"
                                                            : "var(--bs-text-faint)",
                                                        cursor: codeInput.trim()
                                                            ? "pointer"
                                                            : "not-allowed",
                                                        fontSize: 13,
                                                        fontWeight: 600,
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {discountLoading
                                                        ? "…"
                                                        : "Apply"}
                                                </button>
                                            </div>
                                            {discountError && (
                                                <div
                                                    style={{
                                                        fontSize: 12,
                                                        color: "var(--bs-error)",
                                                        marginTop: 6,
                                                    }}
                                                >
                                                    {discountError}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                background:
                                                    "rgba(var(--bs-success-rgb), 0.08)",
                                                border: "1px solid rgba(34,197,94,0.2)",
                                                borderRadius: 10,
                                                padding: "10px 14px",
                                                marginBottom: 16,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        background:
                                                            "rgba(var(--bs-success-rgb), 0.2)",
                                                        borderRadius: 4,
                                                        padding: "2px 7px",
                                                        color: "var(--bs-success)",
                                                        fontWeight: 700,
                                                        letterSpacing: "0.05em",
                                                    }}
                                                >
                                                    {appliedDiscount.code}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: 13,
                                                        color: "var(--bs-success)",
                                                    }}
                                                >
                                                    {appliedDiscount.display}
                                                    {partialDiscount && (
                                                        <span
                                                            style={{
                                                                color: "var(--bs-text-muted)",
                                                                fontSize: 11,
                                                            }}
                                                        >
                                                            {" "}
                                                            · selected items
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <button
                                                onClick={removeManualDiscount}
                                                style={{
                                                    background: "transparent",
                                                    border: "none",
                                                    color: "var(--bs-text-faint)",
                                                    cursor: "pointer",
                                                    fontSize: 18,
                                                    lineHeight: 1,
                                                    padding: 0,
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}

                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 8,
                                            marginBottom: 16,
                                        }}
                                    >
                                        {activeDiscount &&
                                            discountAmount > 0 && (
                                                <>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            justifyContent:
                                                                "space-between",
                                                            fontSize: 13,
                                                            color: "var(--bs-text-secondary)",
                                                        }}
                                                    >
                                                        <span>Subtotal</span>
                                                        <span>
                                                            {format(
                                                                cartSubtotal,
                                                                currency
                                                            )}
                                                        </span>
                                                    </div>
                                                    {partialDiscount && (
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                justifyContent:
                                                                    "space-between",
                                                                fontSize: 11,
                                                                color: "var(--bs-text-faint)",
                                                            }}
                                                        >
                                                            <span>
                                                                Eligible
                                                                subtotal
                                                            </span>
                                                            <span>
                                                                {format(
                                                                    eligibleSubtotal,
                                                                    currency
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            justifyContent:
                                                                "space-between",
                                                            fontSize: 13,
                                                            color: "var(--bs-success)",
                                                        }}
                                                    >
                                                        <span>
                                                            Discount (
                                                            {
                                                                activeDiscount.display
                                                            }
                                                            )
                                                        </span>
                                                        <span>
                                                            −
                                                            {format(
                                                                discountAmount,
                                                                currency
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div
                                                        style={{
                                                            height: 1,
                                                            background:
                                                                "var(--bs-bg-muted)",
                                                        }}
                                                    />
                                                </>
                                            )}
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "baseline",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: 14,
                                                    color: "var(--bs-text-secondary)",
                                                }}
                                            >
                                                Total
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: 22,
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {format(cartTotal, currency)}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleContinueToEmail}
                                        style={{
                                            width: "100%",
                                            height: 52,
                                            borderRadius: 12,
                                            background: "#7C5CFF",
                                            border: "none",
                                            color: "#fff",
                                            cursor: "pointer",
                                            fontSize: 15,
                                            fontWeight: 700,
                                        }}
                                    >
                                        Continue →
                                    </button>
                                </div>
                            </>
                        )}

                        {drawerStep === "email" && (
                            <>
                                <div
                                    className="hide-scrollbar"
                                    style={{
                                        flex: 1,
                                        overflowY: "auto",
                                        padding: "16px 24px",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 8,
                                    }}
                                >
                                    {Object.entries(cartItems).map(
                                        ([
                                            key,
                                            { product, qty, itemPeriod },
                                        ]) => {
                                            const itemCfg = PERIODS[itemPeriod]
                                            const linePrice =
                                                (product as any)[itemCfg.field]
                                            const lineTotal = linePrice
                                                ? linePrice * fxRate * qty
                                                : 0
                                            return (
                                                <div
                                                    key={key}
                                                    style={{
                                                        display: "flex",
                                                        justifyContent:
                                                            "space-between",
                                                        alignItems: "center",
                                                        padding: "8px 0",
                                                        borderBottom:
                                                            "1px solid #1C1C1F",
                                                        gap: 12,
                                                    }}
                                                >
                                                    <div
                                                        style={{ minWidth: 0 }}
                                                    >
                                                        <div
                                                            style={{
                                                                fontSize: 13,
                                                                fontWeight: 600,
                                                                overflow:
                                                                    "hidden",
                                                                textOverflow:
                                                                    "ellipsis",
                                                                whiteSpace:
                                                                    "nowrap",
                                                            }}
                                                        >
                                                            {
                                                                product.name
                                                            }
                                                        </div>
                                                        <div
                                                            style={{
                                                                fontSize: 11,
                                                                color: "var(--bs-text-secondary)",
                                                            }}
                                                        >
                                                            ×{qty} ·{" "}
                                                            {itemCfg.name}
                                                        </div>
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: 13,
                                                            fontWeight: 600,
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        {format(
                                                            lineTotal,
                                                            currency
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        }
                                    )}
                                    {activeDiscount && discountAmount > 0 && (
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                fontSize: 12,
                                                color: "var(--bs-success)",
                                                paddingTop: 4,
                                            }}
                                        >
                                            <span>
                                                Promo: {activeDiscount.code} (
                                                {activeDiscount.display})
                                            </span>
                                            <span>
                                                −
                                                {format(
                                                    discountAmount,
                                                    currency
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "baseline",
                                            paddingTop: 8,
                                            borderTop:
                                                "1px solid var(--bs-border-default)",
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: 13,
                                                color: "var(--bs-text-secondary)",
                                            }}
                                        >
                                            Total
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 20,
                                                fontWeight: 700,
                                            }}
                                        >
                                            {format(cartTotal, currency)}
                                        </span>
                                    </div>
                                </div>

                                <div
                                    style={{
                                        padding: "20px 24px",
                                        borderTop: "1px solid #1C1C1F",
                                        flexShrink: 0,
                                    }}
                                >
                                    <label
                                        style={{
                                            fontSize: 12,
                                            color: "var(--bs-text-secondary)",
                                            display: "block",
                                            marginBottom: 8,
                                        }}
                                    >
                                        Your email address
                                    </label>
                                    <input
                                        className="email-input"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value)
                                            setEmailError("")
                                        }}
                                        onKeyDown={(e) =>
                                            e.key === "Enter" &&
                                            handleSendToWhatsApp()
                                        }
                                        style={{
                                            width: "100%",
                                            height: 48,
                                            padding: "0 16px",
                                            borderRadius: 10,
                                            background: "var(--bs-bg-input)",
                                            border: `1px solid ${emailError ? "var(--bs-error)" : "var(--bs-border-default)"}`,
                                            color: "var(--bs-text-primary)",
                                            fontSize: 14,
                                            boxSizing: "border-box",
                                            marginBottom: 6,
                                        }}
                                    />
                                    {emailError && (
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: "var(--bs-error)",
                                                marginBottom: 10,
                                            }}
                                        >
                                            {emailError}
                                        </div>
                                    )}
                                    <button
                                        onClick={handlePayWithPaystack}
                                        disabled={orderLoading}
                                        style={{
                                            width: "100%",
                                            height: 52,
                                            borderRadius: 12,
                                            background: "#7C5CFF",
                                            border: "none",
                                            color: "#fff",
                                            cursor: orderLoading ? "not-allowed" : "pointer",
                                            fontSize: 15,
                                            fontWeight: 700,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: 10,
                                            transition: "background .15s",
                                            marginTop: 8,
                                            opacity: orderLoading ? 0.6 : 1,
                                        }}
                                    >
                                        {orderLoading ? "Processing..." : `Pay ${format(cartTotal, currency)} with Paystack`}
                                    </button>
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        margin: "16px 0 8px",
                                    }}>
                                        <div style={{ flex: 1, height: 1, background: "var(--bs-border-default)" }} />
                                        <span style={{ fontSize: 12, color: "var(--bs-text-muted)" }}>or</span>
                                        <div style={{ flex: 1, height: 1, background: "var(--bs-border-default)" }} />
                                    </div>
                                    <button
                                        className="wa-btn"
                                        onClick={handleSendToWhatsApp}
                                        disabled={orderLoading}
                                        style={{
                                            width: "100%",
                                            height: 52,
                                            borderRadius: 12,
                                            background: "#25D366",
                                            border: "none",
                                            color: "#fff",
                                            cursor: "pointer",
                                            fontSize: 15,
                                            fontWeight: 700,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: 10,
                                            transition: "background .15s",
                                            marginTop: 8,
                                        }}
                                    >
                                        <WhatsAppIcon />
                                        Send order to WhatsApp
                                    </button>
                                    <p
                                        style={{
                                            fontSize: 11,
                                            color: "var(--bs-text-faint)",
                                            textAlign: "center",
                                            marginTop: 10,
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        Opens WhatsApp with your order
                                        pre-filled. Our team will confirm and
                                        process.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

/* ===============================================================
   SMALL COMPONENTS
=============================================================== */

/*
  ProductLogo — Logo.dev (theme=dark) → Airtable attachment → letter avatar
  theme=dark tells Logo.dev to render logos optimised for dark backgrounds:
  black marks become white, dark logos get adapted colours, coloured logos
  stay as-is. This means the container background must also be dark.
*/
const ProductLogo = ({
    product,
    size = 48,
}: {
    product: any
    size?: number
}) => {
    const domain = String(product.domain || "")
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "")
    const attachment = product.image_url
    const name = String(product.name || "?")
    const letter = name.charAt(0).toUpperCase()
    const colours = ["#2D2D5E", "#1A3A4A", "#2E1A3A", "#1A3A2A", "#3A2A1A"]
    const bg = colours[name.charCodeAt(0) % colours.length]

    const buildSources = (d: string): string[] => {
        const list: string[] = []
        if (d && LOGO_DEV_TOKEN)
            list.push(
                `https://img.logo.dev/${d}?token=${LOGO_DEV_TOKEN}&size=128&format=png&theme=dark&retina=true`
            )
        if (attachment) list.push(attachment)
        return list
    }

    const [sources, setSources] = useState<string[]>(() => buildSources(domain))
    const [idx, setIdx] = useState(0)
    const [allFailed, setAllFailed] = useState(false)

    useEffect(() => {
        const next = buildSources(domain)
        setSources(next)
        setIdx(0)
        setAllFailed(false)
    }, [domain, attachment])

    const onError = () => {
        const nextIdx = idx + 1
        if (nextIdx < sources.length) setIdx(nextIdx)
        else setAllFailed(true)
    }

    const currentSrc = sources[idx]

    if (!allFailed && currentSrc) {
        return (
            <div
                style={{
                    width: size,
                    height: size,
                    borderRadius: 14,
                    flexShrink: 0,
                    background: "var(--bs-bg-elevated)",
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.06)",
                }}
            >
                <img
                    key={currentSrc}
                    src={currentSrc}
                    alt={name}
                    onError={onError}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                    }}
                />
            </div>
        )
    }

    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: 14,
                flexShrink: 0,
                background: bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: Math.round(size * 0.38),
                fontWeight: 700,
                color: "rgba(255,255,255,0.85)",
            }}
        >
            {letter}
        </div>
    )
}

const CartIcon = ({ size = 14 }: { size?: number }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
)

const WhatsAppIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.116 1.523 5.847L.057 23.57a.75.75 0 0 0 .92.92l5.723-1.466A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.93 0-3.736-.518-5.287-1.42l-.379-.225-3.932 1.007 1.007-3.932-.225-.379A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
    </svg>
)

const QtyBtn = ({
    onClick,
    children,
}: {
    onClick: () => void
    children: React.ReactNode
}) => (
    <button
        className="cart-qty-btn"
        onClick={onClick}
        style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "var(--bs-bg-input)",
            border: "1px solid var(--bs-border-default)",
            color: "var(--bs-text-primary)",
            cursor: "pointer",
            fontSize: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "background .15s",
        }}
    >
        {children}
    </button>
)

const DrawerQtyBtn = ({
    onClick,
    children,
}: {
    onClick: () => void
    children: React.ReactNode
}) => (
    <button
        className="cart-qty-btn"
        onClick={onClick}
        style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: "var(--bs-bg-muted)",
            border: "1px solid var(--bs-border-default)",
            color: "var(--bs-text-primary)",
            cursor: "pointer",
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background .15s",
        }}
    >
        {children}
    </button>
)

const cardStyle = (isMobile: boolean) => ({
    background: "var(--bs-bg-card)",
    borderRadius: isMobile ? 20 : 28,
    padding: isMobile ? 16 : 24,
    display: "flex",
    flexDirection: "column" as const,
    gap: isMobile ? 10 : 14,
    justifyContent: "space-between",
})

const S: any = {
    stickyControls: {
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "var(--bs-bg-base)",
        paddingTop: 16,
        paddingBottom: 16,
        marginBottom: 20,
        borderBottom: "1px solid var(--bs-border-default)",
    },
    topBarRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
    },
    topLeftGroup: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
    },
    topRightGroup: { display: "flex", gap: 8, alignItems: "center" },
    segContainer: {
        display: "flex",
        background: "var(--bs-bg-elevated)",
        border: "1px solid var(--bs-border-default)",
        borderRadius: 999,
        padding: 4,
        gap: 4,
        boxSizing: "border-box",
        alignItems: "center",
    },
    segBtn: {
        padding: "0 14px",
        borderRadius: 999,
        color: "var(--bs-text-primary)",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
    },
    clearBtn: {
        position: "absolute",
        right: 10,
        top: "50%",
        transform: "translateY(-50%)",
        background: "transparent",
        border: "none",
        color: "var(--bs-text-secondary)",
        fontSize: 18,
        cursor: "pointer",
        lineHeight: 1,
        padding: 0,
    },
    topRow: { display: "flex", gap: 14, alignItems: "center" },
    icon: { width: 48, height: 48, borderRadius: 14, flexShrink: 0 },
    iconPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 14,
        background: "var(--bs-bg-elevated)",
        flexShrink: 0,
    },
    productRow: {
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 0,
    },
    productName: { fontWeight: 600, lineHeight: 1.3 },
    category: { fontSize: 12, color: "#7C5CFF" },
    description: {
        fontSize: 12,
        color: "var(--bs-text-secondary)",
        lineHeight: 1.5,
    },
    priceBlock: { display: "flex", flexDirection: "column", gap: 4 },
    price: { fontWeight: 700, lineHeight: 1 },
    discountRow: {
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
    },
    strike: {
        fontSize: 12,
        color: "var(--bs-text-muted)",
        textDecoration: "line-through",
    },
    discountBadge: { fontSize: 10, color: "var(--bs-success)" },
    periodLabel: {
        fontSize: 12,
        color: "var(--bs-text-secondary)",
        fontWeight: 500,
    },
    badge: { borderRadius: 999, fontWeight: 500, whiteSpace: "nowrap" },
    bottomBlock: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 8,
    },
    metaRow: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        minWidth: 0,
        flexWrap: "wrap",
    },
    metaSep: { color: "var(--bs-text-faint)", fontSize: 12, flexShrink: 0 },
    tagList: { display: "flex", gap: 6, minWidth: 0, overflow: "hidden" },
    tag: {
        fontSize: 12,
        color: "var(--bs-text-secondary)",
        cursor: "pointer",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    skelIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        background: "var(--bs-bg-subtle)",
        flexShrink: 0,
    },
    skelLineLg: {
        height: 14,
        width: "70%",
        background: "var(--bs-bg-subtle)",
        borderRadius: 6,
        marginBottom: 6,
    },
    skelLineSm: {
        height: 10,
        width: "40%",
        background: "var(--bs-bg-subtle)",
        borderRadius: 6,
    },
    skelPara: {
        height: 10,
        width: "100%",
        background: "var(--bs-bg-subtle)",
        borderRadius: 6,
    },
    skelPrice: {
        height: 18,
        width: 120,
        background: "var(--bs-bg-subtle)",
        borderRadius: 6,
        marginBottom: 6,
    },
    skelSmall: {
        height: 10,
        width: 90,
        background: "var(--bs-bg-subtle)",
        borderRadius: 6,
    },
    skelBadge: {
        height: 24,
        width: 80,
        background: "var(--bs-bg-subtle)",
        borderRadius: 999,
    },
}