import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

const T = {
  card:'#1a1a1a', border:'#2a2a2a', red:'#e53935', redDark:'#b71c1c', redGlow:'rgba(229,57,53,0.18)',
  text:'#f0f0f0', muted:'#888', surface:'#161616',
  neo:'inset 2px 2px 5px rgba(0,0,0,0.6), inset -2px -2px 5px rgba(255,255,255,0.04)',
  neoOut:'4px 4px 10px rgba(0,0,0,0.6), -2px -2px 6px rgba(255,255,255,0.03)',
}

export default function GlobalSearch() {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef              = useRef(null)
  const navigate              = useNavigate()

  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey||e.metaKey) && e.key==='k') { e.preventDefault(); setOpen(o=>!o) }
      if (e.key==='Escape') setOpen(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else { setQuery(''); setResults([]) }
  }, [open])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(search, 250)
    return () => clearTimeout(t)
  }, [query])

  const search = async () => {
    setLoading(true)
    const q = query.trim()
    const [{ data:customers }, { data:equipment }, { data:rentals }] = await Promise.all([
      supabase.from('customers').select('id, full_name, phone, company').ilike('full_name',`%${q}%`).limit(4),
      supabase.from('equipment').select('id, name, daily_rate').ilike('name',`%${q}%`).eq('is_active',true).limit(4),
      supabase.from('rentals').select('id, status, start_date, end_date, customers(full_name)').or(`notes.ilike.%${q}%`).limit(3),
    ])
    setResults([
      ...(customers||[]).map(c=>({ type:'customer', icon:'👤', title:c.full_name, sub:c.company||c.phone, path:'/customers', color:'#6366f1' })),
      ...(equipment||[]).map(e=>({ type:'equipment', icon:'📦', title:e.name, sub:`₪${e.daily_rate}/יום`, path:'/inventory', color:T.red })),
      ...(rentals||[]).map(r=>({ type:'rental', icon:'📋', title:r.customers?.full_name||'השכרה', sub:`${r.start_date} → ${r.end_date}`, path:'/rentals', color:'#10b981' })),
    ])
    setLoading(false)
  }

  const go = (path) => { navigate(path); setOpen(false) }

  const TYPE_LABEL = { customer:'לקוח', equipment:'ציוד', rental:'השכרה' }

  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{ display:'flex', alignItems:'center', gap:8, background:T.card, border:`1px solid ${T.border}`, borderRadius:10, padding:'9px 14px', cursor:'pointer', color:T.muted, fontSize:12, width:'100%', marginBottom:10, boxShadow:T.neo, transition:'all 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor=T.red; e.currentTarget.style.color=T.red }}
        onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.muted }}>
        <span>🔍</span>
        <span style={{ flex:1, textAlign:'right' }}>חיפוש...</span>
        <span style={{ fontSize:10, background:'#222', padding:'2px 6px', borderRadius:6, letterSpacing:1 }}>⌘K</span>
      </button>

      {open && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:80, backdropFilter:'blur(8px)' }}
          onClick={() => setOpen(false)}>
          <div style={{ background:T.surface, borderRadius:16, width:'100%', maxWidth:520, boxShadow:`0 24px 60px rgba(0,0,0,0.9), 0 0 40px ${T.redGlow}`, overflow:'hidden', direction:'rtl', border:`1px solid ${T.border}`, animation:'fadeUp 0.2s ease' }}
            onClick={e => e.stopPropagation()}>
            <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}`}</style>

            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 20px', borderBottom:`1px solid ${T.border}` }}>
              <span style={{ fontSize:16, color:T.red }}>🔍</span>
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                placeholder="חפש לקוח, ציוד או השכרה..."
                style={{ flex:1, border:'none', outline:'none', fontSize:15, color:T.text, background:'transparent', fontWeight:500 }} />
              {loading && <div style={{ width:14, height:14, border:`2px solid ${T.border}`, borderTop:`2px solid ${T.red}`, borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />}
              <button onClick={() => setOpen(false)}
                style={{ background:'#222', border:`1px solid ${T.border}`, borderRadius:6, padding:'4px 8px', cursor:'pointer', color:T.muted, fontSize:11, letterSpacing:1 }}>ESC</button>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>

            <div style={{ maxHeight:360, overflowY:'auto' }}>
              {results.length===0 && query.trim() && !loading && (
                <div style={{ padding:'40px 0', textAlign:'center', color:T.muted }}>
                  <div style={{ fontSize:32, marginBottom:8, opacity:0.3 }}>🔍</div>
                  <div style={{ fontSize:13, letterSpacing:0.5 }}>לא נמצאו תוצאות עבור "{query}"</div>
                </div>
              )}
              {results.length===0 && !query.trim() && (
                <div style={{ padding:'24px 20px', color:T.muted }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:'uppercase', marginBottom:12, color:'#555' }}>חיפוש מהיר</div>
                  {[{ icon:'👤', text:'שם לקוח' }, { icon:'📦', text:'שם פריט ציוד' }, { icon:'📋', text:'הערת השכרה' }].map((h,i) => (
                    <div key={i} style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8, fontSize:13 }}>
                      <span>{h.icon}</span><span>{h.text}</span>
                    </div>
                  ))}
                </div>
              )}
              {results.map((r,i) => (
                <div key={i} onClick={() => go(r.path)}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', cursor:'pointer', transition:'background 0.1s', borderBottom:`1px solid ${T.border}` }}
                  onMouseEnter={e => e.currentTarget.style.background=T.redGlow}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <div style={{ width:36, height:36, borderRadius:10, background:`${r.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0, border:`1px solid ${r.color}33` }}>
                    {r.icon}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:13, color:T.text }}>{r.title}</div>
                    <div style={{ fontSize:11, color:T.muted, marginTop:1 }}>{r.sub}</div>
                  </div>
                  <span style={{ background:`${r.color}18`, color:r.color, fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:20, border:`1px solid ${r.color}33` }}>
                    {TYPE_LABEL[r.type]}
                  </span>
                </div>
              ))}
            </div>

            {results.length>0 && (
              <div style={{ padding:'10px 20px', borderTop:`1px solid ${T.border}`, fontSize:10, color:T.muted, display:'flex', gap:16, letterSpacing:1 }}>
                <span>↵ לחץ לניווט</span><span>ESC לסגירה</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}