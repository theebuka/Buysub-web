'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { toast } from "sonner"
import { useTheme as useThemeController } from '@/lib/theme'
import { getAccessToken } from '@/lib/session'
import { API_BASE } from '@/lib/config'

import { Badge, BtnLabel, CheckIcon, ChevronIcon, DRow, DetailSection, DocumentIcon, EmptyState, Loading, Order, Pagination, PaginationBar, Product, SmallBtn, T, XIcon, apiFetch, dayKey, emptyPagination, fmt, fmtFull, fmtTime, inputStyle, parsePagination } from '../_lib/shared'
import { NewOrderDrawer } from './NewOrderDrawer'

// ════════════════════ ORDERS TAB (accordion, sub-filters) ════════════════════
export function OrdersTab() {
  const [orders,setOrders]=useState<Order[]>([]); const [pagination,setPagination]=useState<Pagination>(emptyPagination)
  const [loading,setLoading]=useState(true); const [statusFilter,setStatusFilter]=useState(''); const [search,setSearch]=useState('')
  const [actionLoading,setActionLoading]=useState<string|null>(null); const [expanded,setExpanded]=useState<string|null>(null)
  const [orderDetails,setOrderDetails]=useState<Record<string,any>>({}); const searchTimer=useRef<any>(null)
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [allProducts, setAllProducts] = useState<Product[]>([])

useEffect(() => {
  apiFetch('/v2/admin/products?limit=500').then(r => {
    if (r.ok) setAllProducts(r.data || [])
  })
}, [])

  const load = useCallback(async(page=1,status=statusFilter,q=search)=>{
    setLoading(true); const params=new URLSearchParams({page:String(page),limit:'30'})
    if(status)params.set('status',status); if(q)params.set('q',q)
    const r=await apiFetch(`/v2/admin/orders?${params}`)
    if(r.ok){setOrders(r.data||[]);setPagination(parsePagination(r))} setLoading(false)
  },[statusFilter,search])

  useEffect(()=>{load()},[])
  const onSearch=(q:string)=>{setSearch(q);clearTimeout(searchTimer.current);searchTimer.current=setTimeout(()=>load(1,statusFilter,q),400)}

  const toggleExpand = async(ref:string) => {
    if(expanded===ref){setExpanded(null);return}
    setExpanded(ref)
    if(!orderDetails[ref]){
      const r=await apiFetch(`/v2/admin/orders/${ref}`)
      if(r.ok&&r.data) setOrderDetails(prev=>({...prev,[ref]:r.data}))
    }
  }

  const approve = async (ref: string) => {
    const r = await apiFetch(`/v2/admin/orders/${ref}/approve`, {
      method: 'POST'
    })
  
    if (r.ok) {
      setOrders(prev =>
        prev.map(o =>
          o.order_ref === ref
            ? { ...o, status: r.data?.status || 'paid' } // what the server set
            : o
        )
      )
      toast.success("Order approved")
    } else {
      toast.error(r.error || 'Failed to approve')
    }
  }
  const reject = async (ref: string) => {
    const r = await apiFetch(`/v2/admin/orders/${ref}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Rejected' }),
    })
  
    if (r.ok) {
      setOrders(prev =>
        prev.map(o =>
          o.order_ref === ref
            // Stage one only: rejected_pending (warning, undoable), not terminal.
            ? { ...o, status: r.data?.status || 'rejected_pending' }
            : o
        )
      )
      toast.success("Order rejected")
    } else {
      toast.error(r.error || 'Failed to reject')
    }
  }
  const openReceipt=(ref:string)=>{window.open(`/admin/receipt?ref=${ref}`,'_blank')}

  const grouped:{day:string;orders:Order[]}[]=[];let lastDay='';for(const o of orders){const d=dayKey(o.created_at);if(d!==lastDay){grouped.push({day:d,orders:[]});lastDay=d}grouped[grouped.length-1].orders.push(o)}
  const STATUS_FILTERS=[{label:'All',value:''},{label:'Pending',value:'pending_manual'},{label:'Paid',value:'paid'},{label:'Cancelled',value:'cancelled'},{label:'Refunded',value:'refunded'}]

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:'var(--bs-space-3)', marginBottom:'var(--bs-space-4)', flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:'var(--bs-space-1)', background:T.elevated, borderRadius:'var(--bs-radius-full)', padding:'var(--bs-space-1)', border:`1px solid ${T.border}` }}>
          {STATUS_FILTERS.map(f => (
            <button key={f.value} onClick={() => { setStatusFilter(f.value); load(1, f.value, search) }} style={{
              height:'var(--bs-control-sm)', padding:'0 var(--bs-space-4)', borderRadius:'var(--bs-radius-full)',
              fontSize:'var(--bs-text-xs)', fontWeight:statusFilter===f.value?600:400, border:'none', cursor:'pointer',
              // The label stays #fff, but the FILL under it is --bs-accent-fill,
              // not --bs-accent: #fff on the plain accent is 4.35:1 and fails
              // AA at this size. Only the active state fills, so only it needs
              // the token; the inactive branch is transparent.
              background:statusFilter===f.value?T.accentFill:'transparent', color:statusFilter===f.value?'#fff':T.text,
              transition:'background var(--bs-dur-1) var(--bs-ease-out)',
            }}>{f.label}</button>
          ))}
        </div>
        <button
          onClick={() => setShowNewOrder(true)}
          style={{
            height:'var(--bs-control-md)', padding:'0 var(--bs-space-4)', borderRadius:'var(--bs-radius-md)',
            background:T.accentFill, border:'none',
            color:'#fff', cursor:'pointer', fontSize:'var(--bs-text-sm)', fontWeight:600,
            display:'inline-flex', alignItems:'center', gap:'var(--bs-space-2)',
            boxShadow:'0 4px 14px rgba(var(--bs-accent-rgb), 0.25)',
          }}
        >
          <span style={{ fontSize:15, lineHeight:1 }}>+</span> New Order
        </button>
      </div>

      <div style={{marginBottom:20}}><input placeholder="Search by ref, name, or email…" value={search} onChange={e=>onSearch(e.target.value)} style={inputStyle()}/></div>

      {loading?<Loading/>:orders.length===0?<EmptyState text="No orders found"/>:(
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {grouped.map(group=>(
            <div key={group.day}>
              <div style={{fontSize:11,fontWeight:600,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.06em',padding:'14px 0 8px'}}>{group.day}</div>
              {group.orders.map(o=>{
                const det = orderDetails[o.order_ref]
                const isExp = expanded===o.order_ref
                return (
                  <div key={o.id} style={{background:T.card,border:`1px solid ${T.borderSubtle}`,borderRadius:'var(--bs-radius-lg)',marginBottom:8,overflow:'hidden'}}>
                    {/* Compact row */}
                    <div onClick={()=>toggleExpand(o.order_ref)} style={{padding:'14px 20px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                      <div style={{display:'flex',gap:10,alignItems:'center',minWidth:0,flex:1}}>
                        <span style={{fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',fontSize:13,fontWeight:600,color:T.text}}>{o.order_ref}</span>
                        <Badge status={o.status}/>
                        <span style={{fontSize:12,color:T.textSecondary}}>{o.customer_name||'—'}</span>
                        <span style={{fontSize:11,color:T.textMuted}}>{fmtTime(o.created_at)}</span>
                      </div>
                      <div style={{display:'flex',gap:12,alignItems:'center',flexShrink:0}}>
                        <span style={{fontSize:'var(--bs-text-lg)',fontWeight:700,color:T.text}}>{fmt(o.total_ngn)}</span>
                        <span style={{color:T.textMuted,fontSize:'var(--bs-text-xs)',display:'inline-flex'}}><ChevronIcon open={isExp} /></span>
                      </div>
                    </div>
                    {/* Expanded details */}
                    {isExp&&(
                      <div style={{padding:'0 20px 18px',borderTop:`1px solid ${T.borderSubtle}`}}>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:20,padding:'16px 0'}}>
                          <DetailSection title="Customer">
                            <DRow label="Name" value={o.customer_name||'—'}/>
                            <DRow label="Email" value={o.customer_email||'—'}/>
                            <DRow label="Phone" value={o.customer_phone||'—'}/>
                          </DetailSection>
                          <DetailSection title="Order">
                            <DRow label="Ref" value={o.order_ref}/>
                            <DRow label="Status" value={o.status.replace(/_/g,' ')}/>
                            <DRow label="Payment" value={o.payment_method||'—'}/>
                            <DRow label="Currency" value={o.currency}/>
                          </DetailSection>
                          <DetailSection title="Amounts">
                            <DRow label="Subtotal" value={fmt(o.subtotal_ngn)}/>
                            {o.discount_ngn>0&&<DRow label="Discount" value={`-${fmt(o.discount_ngn)}`}/>}
                            <DRow label="Total" value={fmt(o.total_ngn)}/>
                          </DetailSection>
                          <DetailSection title="Timestamps">
                            <DRow label="Created" value={fmtFull(o.created_at)}/>
                            <DRow label="Updated" value={fmtFull(o.updated_at)}/>
                          </DetailSection>
                        </div>
                        {det?.order_items&&det.order_items.length>0&&(
                          <div style={{marginBottom:12}}>
                            <div style={{fontSize:'var(--bs-text-2xs)',fontWeight:600,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Items</div>
                            {det.order_items.map((it:any,i:number)=>(
                              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:i<det.order_items.length-1?`1px solid ${T.borderSubtle}`:'none',fontSize:12}}>
                                <span style={{color:T.text}}>{it.product_name} <span style={{color:T.textMuted}}>× {it.quantity}</span></span>
                                <span style={{color:T.textSecondary}}>{fmt(it.total_price_ngn||it.unit_price_ngn*it.quantity)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {o.notes&&<div style={{fontSize:12,color:T.textMuted,marginBottom:10}}>Notes: {o.notes}</div>}
                        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                          {o.status==='pending_manual'&&<>
                            <SmallBtn color={T.success} onClick={()=>approve(o.order_ref)} disabled={actionLoading===o.order_ref}>{actionLoading===o.order_ref?'…':<BtnLabel icon={<CheckIcon/>}>Approve</BtnLabel>}</SmallBtn>
                            <SmallBtn color={T.error} onClick={()=>reject(o.order_ref)} disabled={actionLoading===o.order_ref}><BtnLabel icon={<XIcon/>}>Reject</BtnLabel></SmallBtn>
                          </>}
                          {o.status==='paid'&&<SmallBtn color={T.accent} onClick={()=>openReceipt(o.order_ref)}><BtnLabel icon={<DocumentIcon/>}>Receipt</BtnLabel></SmallBtn>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
      {pagination?.pages>1&&<PaginationBar pagination={pagination} onPage={p=>load(p)}/>}
      {showNewOrder && (
        <NewOrderDrawer
         
          allProducts={allProducts}
          onClose={() => setShowNewOrder(false)}
          onCreated={() => load(pagination.page)}
        />
      )}
    </div>
  )
}
