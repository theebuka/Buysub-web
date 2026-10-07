'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { toast } from "sonner"
import { useTheme as useThemeController } from '@/lib/theme'
import { getAccessToken } from '@/lib/session'
import { API_BASE } from '@/lib/config'

import { Badge, BtnLabel, EmptyState, Loading, Order, SmallBtn, T, UndoIcon, XIcon, apiFetch, fmt } from '../_lib/shared'

// ════════════════════ REJECTED TAB ════════════════════
export function RejectedTab() {
  const [orders,setOrders]=useState<Order[]>([]); const [loading,setLoading]=useState(true); const [actionLoading,setActionLoading]=useState<string|null>(null)
  const load=useCallback(async()=>{setLoading(true);const r=await apiFetch('/v2/admin/orders?status=rejected_pending&limit=50');if(r.ok)setOrders(r.data||[]);setLoading(false)},[])
  useEffect(()=>{load()},[])
  const confirmReject=async(ref:string)=>{if(!confirm(`Permanently reject ${ref}?`))return;setActionLoading(ref);const r=await apiFetch(`/v2/admin/orders/${ref}/reject`,{method:'POST',body:JSON.stringify({confirm:true})});if(r.ok||r.data?.rejected)await load();else toast.error(r.error||'Failed');setActionLoading(null)}
  const undoReject=async(ref:string)=>{setActionLoading(ref);const r=await apiFetch(`/v2/admin/orders/${ref}/undo-reject`,{method:'POST'});if(r.ok||r.data?.undone)await load();else toast.error(r.error||'Failed');setActionLoading(null)}
  return (
    <div>
      <div style={{fontSize:13,color:T.warning,marginBottom:20,padding:'12px 16px',background:T.warningBg,borderRadius:'var(--bs-radius-lg)',border:`1px solid rgba(var(--bs-warning-rgb), 0.2)`}}>Orders here need a second confirmation before permanent cancellation. Use Undo to restore.</div>
      {loading?<Loading/>:orders.length===0?<EmptyState text="No rejected orders pending"/>:(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {orders.map(o=>(
            <div key={o.id} style={{background:T.card,border:`1px solid ${T.borderSubtle}`,borderRadius:'var(--bs-radius-lg)',padding:'18px 22px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}><span style={{fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',fontSize:13,fontWeight:600,color:T.text}}>{o.order_ref}</span><Badge status="rejected_pending"/></div>
                  <div style={{fontSize:13,color:T.textSecondary}}>{o.customer_name||o.customer_email||'—'}</div>
                  {o.notes&&<div style={{fontSize:12,color:T.textMuted,marginTop:4}}>Reason: {o.notes}</div>}
                </div>
                <div style={{fontSize:20,fontWeight:700,color:T.text}}>{fmt(o.total_ngn)}</div>
              </div>
              <div style={{display:'flex',gap:8,marginTop:12}}>
                <SmallBtn color={T.success} onClick={()=>undoReject(o.order_ref)} disabled={actionLoading===o.order_ref}><BtnLabel icon={<UndoIcon/>}>Undo</BtnLabel></SmallBtn>
                <SmallBtn color={T.error} onClick={()=>confirmReject(o.order_ref)} disabled={actionLoading===o.order_ref}><BtnLabel icon={<XIcon/>}>Confirm</BtnLabel></SmallBtn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
