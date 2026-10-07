'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { toast } from "sonner"
import { useTheme as useThemeController } from '@/lib/theme'
import { getAccessToken } from '@/lib/session'
import { API_BASE } from '@/lib/config'

import { EmptyState, Loading, Pagination, PaginationBar, T, apiFetch, emptyPagination, fmt, fmtDate, parsePagination } from '../_lib/shared'

// ════════════════════ WALLETS TAB ════════════════════
export function WalletsTab() {
  // Recent wallet transactions across all customers. This used to fetch the
  // list, discard it, and always render the empty state.
  const [txns,setTxns]=useState<any[]>([]); const [pagination,setPagination]=useState<Pagination>(emptyPagination)
  const [loading,setLoading]=useState(true)
  const load=useCallback(async(page=1)=>{setLoading(true);const r=await apiFetch(`/v2/admin/wallets?page=${page}&limit=20`);if(r.ok){setTxns(r.data||[]);setPagination(parsePagination(r))}setLoading(false)},[])
  useEffect(()=>{load()},[])
  if(loading) return <Loading/>
  if(txns.length===0) return <EmptyState text="Wallet transactions will appear here once customers start using wallets."/>
  return (
    <div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {txns.map((t:any)=>{
          const credit=t.type==='credit'
          return (
            <div key={t.id} style={{background:T.card,border:`1px solid ${T.borderSubtle}`,borderRadius:'var(--bs-radius-lg)',padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:'var(--bs-text-sm)',fontWeight:500,color:T.text,overflowWrap:'anywhere'}}>{t.reference||'—'}</div>
                <div style={{fontSize:12,color:T.textMuted,marginTop:3}}>{fmtDate(t.created_at)} · {String(t.source||'').replace(/_/g,' ')} · balance after {fmt(t.balance_after)}</div>
              </div>
              <div style={{fontSize:'var(--bs-text-sm)',fontWeight:600,color:credit?T.success:T.error,whiteSpace:'nowrap'}}>{credit?'+':'−'}{fmt(t.amount_ngn)}</div>
            </div>
          )
        })}
      </div>
      {pagination?.pages>1&&<PaginationBar pagination={pagination} onPage={p=>load(p)}/>}
    </div>
  )
}
