'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { toast } from "sonner"
import { useTheme as useThemeController } from '@/lib/theme'
import { getAccessToken } from '@/lib/session'
import { API_BASE } from '@/lib/config'

import { EmptyState, Loading, Pagination, PaginationBar, SmallBtn, T, apiFetch, emptyPagination, inputStyle, parsePagination } from '../_lib/shared'

// ════════════════════ ADS TAB ════════════════════
export function AdsTab() {
  const [ads,setAds]=useState<any[]>([]); const [pagination,setPagination]=useState<Pagination>(emptyPagination)
  const [loading,setLoading]=useState(true); const [showCreate,setShowCreate]=useState(false); const [creating,setCreating]=useState(false)
  const PLACEMENTS=['shop_banner','shop_sidebar','shop_product_card','cart_drawer','receipt_footer']
  const [newAd,setNewAd]=useState({title:'',image_url:'',link:'',placement:'shop_banner'})
  const load=useCallback(async(page=1)=>{setLoading(true);const r=await apiFetch(`/v2/admin/ads?page=${page}&limit=20`);if(r.ok){setAds(r.data||[]);setPagination(parsePagination(r))}setLoading(false)},[])
  useEffect(()=>{load()},[])
  const createAd=async()=>{if(!newAd.title||!newAd.image_url||!newAd.link)return;setCreating(true);const r=await apiFetch('/v2/admin/ads',{method:'POST',body:JSON.stringify(newAd)});if(r.ok){setNewAd({title:'',image_url:'',link:'',placement:'shop_banner'});setShowCreate(false);await load(1)}else toast.error(r.error||'Failed');setCreating(false)}
  const toggleActive=async(a:any)=>{const r=await apiFetch(`/v2/admin/ads/${a.id}`,{method:'PATCH',body:JSON.stringify({active:!a.active})});if(r.ok)setAds(prev=>prev.map(x=>x.id===a.id?{...x,active:!a.active}:x))}
  const deleteAd=async(id:string)=>{if(!confirm('Delete this ad?'))return;await apiFetch(`/v2/admin/ads/${id}`,{method:'DELETE'});await load(pagination.page)}
  const IS=inputStyle()
  return (
    <div>
      <button onClick={()=>setShowCreate(!showCreate)} style={{height:'var(--bs-control-md)',padding:'0 20px',borderRadius:10,background:T.accentFill,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,marginBottom:20}}>+ New Ad</button>
      {showCreate&&(
        <div style={{background:T.card,border:`1px solid ${T.borderSubtle}`,borderRadius:'var(--bs-radius-lg)',padding:20,marginBottom:20,display:'flex',flexDirection:'column',gap:10}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10}}>
            <input placeholder="Title *" value={newAd.title} onChange={e=>setNewAd({...newAd,title:e.target.value})} style={IS}/>
            <input placeholder="Image URL *" value={newAd.image_url} onChange={e=>setNewAd({...newAd,image_url:e.target.value})} style={IS}/>
            <input placeholder="Link URL *" value={newAd.link} onChange={e=>setNewAd({...newAd,link:e.target.value})} style={IS}/>
            <select value={newAd.placement} onChange={e=>setNewAd({...newAd,placement:e.target.value})} style={IS}>{PLACEMENTS.map(p=><option key={p} value={p}>{p.replace(/_/g,' ')}</option>)}</select>
          </div>
          <div style={{display:'flex',gap:6}}><SmallBtn color={T.accent} onClick={createAd}>{creating?'…':'Create'}</SmallBtn><SmallBtn color={T.textMuted} onClick={()=>setShowCreate(false)}>Cancel</SmallBtn></div>
        </div>
      )}
      {loading?<Loading/>:ads.length===0?<EmptyState text="No ads"/>:(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {ads.map((a:any)=>(
            <div key={a.id} style={{background:T.card,border:`1px solid ${T.borderSubtle}`,borderRadius:'var(--bs-radius-lg)',padding:'14px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,opacity:a.active?1:0.5,flexWrap:'wrap'}}>
              <div style={{display:'flex',gap:12,alignItems:'center',minWidth:0}}>
                <img src={a.image_url} alt="" style={{width:44,height:44,borderRadius:10,objectFit:'cover',flexShrink:0}}/>
                <div style={{minWidth:0}}><div style={{fontSize:13,fontWeight:500,color:T.text}}>{a.title}</div><div style={{fontSize:11,color:T.textMuted}}>{a.placement?.replace(/_/g,' ')} · {a.click_count||0} clicks · {a.view_count||0} views</div></div>
              </div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <SmallBtn color={a.active?T.warning:T.success} onClick={()=>toggleActive(a)}>{a.active?'Pause':'Resume'}</SmallBtn>
                <SmallBtn color={T.error} onClick={()=>deleteAd(a.id)}>Delete</SmallBtn>
              </div>
            </div>
          ))}
        </div>
      )}
      {pagination?.pages>1&&<PaginationBar pagination={pagination} onPage={p=>load(p)}/>}
    </div>
  )
}
