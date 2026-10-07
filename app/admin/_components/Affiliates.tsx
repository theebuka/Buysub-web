'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { toast } from "sonner"
import { useTheme as useThemeController } from '@/lib/theme'
import { getAccessToken } from '@/lib/session'
import { API_BASE } from '@/lib/config'

import { Badge, EmptyState, Loading, Pagination, PaginationBar, SmallBtn, T, apiFetch, emptyPagination, parsePagination, inputStyle } from '../_lib/shared'

// ════════════════════ AFFILIATES TAB ════════════════════
export function AffiliatesTab() {
  const [affiliates,setAffiliates]=useState<any[]>([]); const [pagination,setPagination]=useState<Pagination>(emptyPagination)
  const [loading,setLoading]=useState(true); const [statusFilter,setStatusFilter]=useState(''); const [actionLoading,setActionLoading]=useState<string|null>(null)
  const load=useCallback(async(page=1,status=statusFilter)=>{setLoading(true);const params=new URLSearchParams({page:String(page),limit:'20'});if(status)params.set('status',status);const r=await apiFetch(`/v2/admin/affiliates?${params}`);if(r.ok){setAffiliates(r.data||[]);setPagination(parsePagination(r))}setLoading(false)},[statusFilter])
  useEffect(()=>{load()},[])
  const approve=async(id:string)=>{const rate=prompt('Commission rate (%):','5');if(rate===null)return;setActionLoading(id);await apiFetch(`/v2/admin/affiliates/${id}/approve`,{method:'POST',body:JSON.stringify(rate.trim()===''?{}:{commission_rate:Number(rate)})});await load(pagination.page);setActionLoading(null)}
  const suspend=async(id:string)=>{setActionLoading(id);await apiFetch(`/v2/admin/affiliates/${id}/suspend`,{method:'POST',body:JSON.stringify({reason:'Admin action'})});await load(pagination.page);setActionLoading(null)}
  return (
    <div>
      <select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);load(1,e.target.value)}} style={{...inputStyle(),width:170,marginBottom:20}}>
        <option value="">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="suspended">Suspended</option>
      </select>
      {loading?<Loading/>:affiliates.length===0?<EmptyState text="No affiliates"/>:(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {affiliates.map((a:any)=>(
            <div key={a.id} style={{background:T.card,border:`1px solid ${T.borderSubtle}`,borderRadius:'var(--bs-radius-lg)',padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
              <div>
                <div style={{fontSize:'var(--bs-text-sm)',fontWeight:500,color:T.text}}>{a.business_name||a.store_name||'—'}</div>
                <div style={{fontSize:12,color:T.textMuted,marginTop:3}}>Code: <span style={{fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',background:T.elevated,padding:'2px 8px',borderRadius:6}}>{a.referral_code}</span> · {a.commission_rate}%</div>
              </div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <Badge status={a.status}/>
                {a.status==='pending'&&<SmallBtn color={T.success} onClick={()=>approve(a.id)} disabled={actionLoading===a.id}>Approve</SmallBtn>}
                {a.status==='approved'&&<SmallBtn color={T.warning} onClick={()=>suspend(a.id)} disabled={actionLoading===a.id}>Suspend</SmallBtn>}
              </div>
            </div>
          ))}
        </div>
      )}
      {pagination?.pages>1&&<PaginationBar pagination={pagination} onPage={p=>load(p)}/>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// LINKS TAB — Short links management with full feature support
// ════════════════════════════════════════════════════════════════════
//
// Feature matrix (UI ↔ backend)
//   ✅ Edit destination               short_links.destination_url
//   ✅ Expiration by date             short_links.expires_at
//   ✅ Expiration by click limit      short_links.click_limit
//   ✅ Link cloaking                  short_links.cloak
//   ✅ Referrer hiding                short_links.hide_referrer
//   ✅ Password protection            short_links.password_hash (SHA-256)
//   ✅ Deep links (ios/android)       short_links.deep_link_* + *_app_store_id / *_package
//   ✅ Region / city / country / OS   short_link_rules (priority-ordered)
//   ✅ QR code w/ color + download    client-side, via api.qrserver.com
//   ✅ UTM params                     short_links.utm_*
//   ✅ Edit existing links            PATCH /v2/admin/links/:id
//   ⛔ Main-page redirect / 404        domain-level, belongs in shortener worker settings, not per-link
//
// Conventions
//   • All new sub-components (form sections, pickers, rule editors) are
//     defined at module level — never inside LinksTab — to preserve
//     input focus across re-renders. See userMemory: "Component stability".
//   • Only `SmallBtn`, `Card`, `Loading`, `EmptyState`, `PaginationBar`,
//     `apiFetch`, `toast`, `inputStyle`, `parsePagination`, `Pagination`,
//     `emptyPagination`, `Theme` are imported from the existing admin scope.
