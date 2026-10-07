'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { toast } from "sonner"
import { useTheme as useThemeController } from '@/lib/theme'
import { getAccessToken } from '@/lib/session'
import { API_BASE } from '@/lib/config'

import { Badge, Card, EmptyState, ErrorMsg, KpiCard, Loading, Stats, T, apiFetch, fmt, fmtDate, fmtFull } from '../_lib/shared'

// ════════════════════ OVERVIEW ════════════════════
export function OverviewTab() {
  const [stats,setStats]=useState<Stats|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState('')
  useEffect(()=>{apiFetch('/v2/admin/stats').then(r=>{if(r.ok)setStats(r.data);else setError(r.error||'Failed')}).catch(()=>setError('Network error')).finally(()=>setLoading(false))},[])
  if(loading) return <Loading/>; if(error) return <ErrorMsg msg={error}/>; if(!stats) return null
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14,marginBottom:28}}>
        <KpiCard label="Revenue Today" value={fmt(stats.revenue_today)}/>
        <KpiCard label="Revenue (Month)" value={fmt(stats.revenue_this_month)}/>
        <KpiCard label="Total Revenue" value={fmt(stats.total_revenue)}/>
        <KpiCard label="Orders Today" value={String(stats.orders_today)}/>
        <KpiCard label="Pending WhatsApp" value={String(stats.orders_pending_manual)} highlight={stats.orders_pending_manual>0}/>
        <KpiCard label="Active Products" value={`${stats.products_active}/${stats.products_total}`}/>
        <KpiCard label="Customers" value={String(stats.customers_total)}/>
        <KpiCard label="Partners Pending" value={String(stats.partners_pending)} highlight={stats.partners_pending>0}/>
      </div>
      {/* `min(380px, 100%)`, not a bare 380px. auto-fit collapses to one track
          on a phone, but a bare floor keeps that track 380px wide against a
          312px container, so the tab overflowed by 59px — the widest floor in
          the file, on the tab an admin lands on first. */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(380px, 100%),1fr))',gap:18}}>
        <Card title="Top Products (by revenue)">
          {(!stats.top_products||stats.top_products.length===0)&&<EmptyState text="No sales data yet"/>}
          {stats.top_products?.map((p,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:i<stats.top_products.length-1?`1px solid ${T.borderSubtle}`:'none'}}>
              <div><div style={{fontSize:13,color:T.text}}>{p.name}</div><div style={{fontSize:11,color:T.textMuted}}>{p.order_count} orders</div></div>
              <div style={{fontSize:13,fontWeight:600,color:T.text}}>{fmt(p.revenue)}</div>
            </div>
          ))}
        </Card>
        <Card title="Recent Orders">
          {(!stats.recent_orders||stats.recent_orders.length===0)&&<EmptyState text="No orders yet"/>}
          {stats.recent_orders?.map((o:any,i:number)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:i<stats.recent_orders.length-1?`1px solid ${T.borderSubtle}`:'none',gap:12}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:13,color:T.text,display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',fontSize:12}}>{o.order_ref}</span><Badge status={o.status}/>
                </div>
                <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>{o.customer_name||o.customer_email||'—'} · {fmtFull(o.created_at)}</div>
              </div>
              <div style={{fontSize:'var(--bs-text-sm)',fontWeight:600,color:T.text,flexShrink:0}}>{fmt(o.total_ngn)}</div>
            </div>
          ))}
        </Card>
      </div>
      {stats.revenue_by_day&&stats.revenue_by_day.length>0&&(
        <Card title="Revenue (Last 30 Days)" style={{marginTop:18}}>
          <div style={{display:'flex',alignItems:'flex-end',gap:3,height:140,paddingTop:8}}>
            {(()=>{const max=Math.max(...stats.revenue_by_day.map(d=>d.revenue),1);return stats.revenue_by_day.map((d,i)=>(
              <div key={i} title={`${fmtDate(d.day)}: ${fmt(d.revenue)} (${d.orders} orders)`} style={{flex:1,minWidth:4,maxWidth:24,height:`${Math.max(2,(d.revenue/max)*100)}%`,background:T.accent,borderRadius:'4px 4px 0 0',cursor:'help',opacity:0.65,transition:'opacity 0.15s'}} onMouseEnter={e=>(e.currentTarget.style.opacity='1')} onMouseLeave={e=>(e.currentTarget.style.opacity='0.65')}/>
            ))})()}
          </div>
        </Card>
      )}
    </div>
  )
}
