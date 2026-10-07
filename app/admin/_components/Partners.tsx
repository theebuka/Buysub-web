'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { toast } from "sonner"
import { useTheme as useThemeController } from '@/lib/theme'
import { getAccessToken } from '@/lib/session'
import { API_BASE } from '@/lib/config'

import { Badge, BtnLabel, ChevronIcon, DRow, DetailSection, EmptyState, Loading, Pagination, PaginationBar, PartnerApp, SmallBtn, T, XIcon, apiFetch, emptyPagination, fmtDate, parsePagination, inputStyle } from '../_lib/shared'

// ════════════════════ PARTNERS TAB ════════════════════
export function PartnersTab() {
  const [apps,setApps]=useState<PartnerApp[]>([]); const [pagination,setPagination]=useState<Pagination>(emptyPagination)
  const [loading,setLoading]=useState(true); const [statusFilter,setStatusFilter]=useState(''); const [expanded,setExpanded]=useState<string|null>(null)
  const [actionLoading,setActionLoading]=useState<string|null>(null)
  const load=useCallback(async(page=1,status=statusFilter)=>{setLoading(true);const params=new URLSearchParams({page:String(page),limit:'20'});if(status)params.set('status',status);const r=await apiFetch(`/v2/admin/partners?${params}`);if(r.ok){setApps(r.data||[]);setPagination(parsePagination(r))}setLoading(false)},[statusFilter])
  useEffect(()=>{load()},[])
  const approve=async(id:string)=>{const notes=prompt('Approval notes (optional):');if(notes===null)return;setActionLoading(id);const r=await apiFetch(`/v2/admin/partners/${id}/approve`,{method:'POST',body:JSON.stringify({notes})});if(r.ok)await load(pagination.page);else toast.error(r.error||'Failed');setActionLoading(null)}
  const reject=async(id:string)=>{const reason=prompt('Rejection reason:');if(!reason)return;setActionLoading(id);const r=await apiFetch(`/v2/admin/partners/${id}/reject`,{method:'POST',body:JSON.stringify({reason})});if(r.ok)await load(pagination.page);else toast.error(r.error||'Failed');setActionLoading(null)}
  return (
    <div>
      <select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);load(1,e.target.value)}} style={{...inputStyle(),width:200,marginBottom:20}}>
        <option value="">All applications</option><option value="pending_review">Pending Review</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
      </select>
      {loading?<Loading/>:apps.length===0?<EmptyState text="No partner applications"/>:(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {apps.map(a=>(
            <div key={a.id} style={{background:T.card,border:`1px solid ${T.borderSubtle}`,borderRadius:'var(--bs-radius-lg)',overflow:'hidden'}}>
              <div onClick={()=>setExpanded(expanded===a.id?null:a.id)} style={{padding:'16px 22px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:'var(--bs-text-sm)',color:T.text,fontWeight:500}}>{a.legal_name}</div>
                  <div style={{fontSize:12,color:T.textMuted,marginTop:3}}>{a.owner_name} · {a.business_email} · {a.state}</div>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
                  <Badge status={a.status}/><span style={{fontSize:11,color:T.textMuted}}>{fmtDate(a.created_at)}</span>
                  <span style={{color:T.textMuted}}><ChevronIcon open={expanded===a.id} /></span>
                </div>
              </div>
              {expanded===a.id&&(
                <div style={{padding:'0 22px 22px',borderTop:`1px solid ${T.borderSubtle}`}}>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:20,padding:'18px 0'}}>
                    <DetailSection title="Business">
                      <DRow label="Store" value={a.store_name}/><DRow label="Address" value={a.address}/>
                      <DRow label="LGA/State" value={`${a.lga}, ${a.state}`}/><DRow label="Phone" value={a.business_phone}/>
                      <DRow label="CAC" value={a.cac_number||'—'}/>
                    </DetailSection>
                    <DetailSection title="Owner">
                      <DRow label="Name" value={a.owner_name}/><DRow label="Email" value={a.owner_email}/>
                      <DRow label="Phone" value={a.owner_phone}/><DRow label="Gender" value={a.gender||'—'}/>
                    </DetailSection>
                    <DetailSection title="Payout">
                      <DRow label="Frequency" value={a.payout_frequency}/><DRow label="Method" value={a.payout_method}/>
                      {a.bank_name&&<DRow label="Bank" value={`${a.bank_name} - ${a.account_name}`}/>}
                    </DetailSection>
                  </div>
                  {a.status==='pending_review'&&(
                    <div style={{display:'flex',gap:8}}>
                      <SmallBtn color={T.success} onClick={()=>approve(a.id)} disabled={actionLoading===a.id}>{actionLoading===a.id?'…':'✓ Approve'}</SmallBtn>
                      <SmallBtn color={T.error} onClick={()=>reject(a.id)} disabled={actionLoading===a.id}><BtnLabel icon={<XIcon/>}>Reject</BtnLabel></SmallBtn>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {pagination?.pages>1&&<PaginationBar pagination={pagination} onPage={p=>load(p)}/>}
    </div>
  )
}
