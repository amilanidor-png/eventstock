import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

export default function GlobalSearch() {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef              = useRef(null)
  const navigate              = useNavigate()

  // פתיחה עם Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else { setQuery(''); setResults([]) }
  }, [open])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(search, 250)
    return () => clearTimeout(timer)
  }, [query])

  const search = async () => {
    setLoading(true)
    const q = query.trim()

    const [{ data: customers }, { data: equipment }, { data: rentals }] = await Promise.all([
      supabase.from('customers').select('id, full_name, phone, company').ilike('full_name', `%${q}%`).limit(4),
      supabase.from('equipment').select('id, name, category, daily_rate').ilike('name', `%${q}%`).eq('is_active', true).limit(4),
      supabase.from('rentals').select('id, status, start_date, end_date, customers(full_name)').or(`notes.ilike.%${q}%`).limit(3),
    ])

    const all = [
      ...(customers||[]).map(c => ({ type:'customer', icon:'👤', title:c.full_name, sub: c.company || c.phone, id:c.id, path:'/customers' })),
      ...(equipment||[]).map(e => ({ type:'equipment', icon:'📦', title:e.name, sub:`₪${e.daily_rate}/יום`, id:e.id, path:'/inventory' })),
      ...(rentals||[]).map(r => ({ type:'rental', icon:'📋', title:r.customers?.full_name || 'השכרה', sub:`${r.start_date} → ${r.end_date}`, id:r.id, path:'/rentals' })),
    ]
    setResults(all)
    setLoading(false)
  }

  const go = (path) => {
    navigate(path)
    setOpen(false)
  }

  const TYPE_LABEL = { customer:'לקוח', equipment:'ציוד', rental:'השכרה' }
  const TYPE_COLOR = { customer:'#6366f1', equipment:'#f59e0b', rental:'#10b981' }
  const TYPE_BG    = { customer:'#eef2ff', equipment:'#fffbeb', rental:'#ecfdf5' }

  return (
    <>
      {/* כפתור חיפוש בתפריט */}
      <button onClick={() => setOpen(true)}
        style={{ display:'flex', alignItems:'center', gap:8, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'8px 14px', cursor:'pointer', color:'#94a3b8', fontSize:13, width:'100%', marginBottom:8, transition:'all 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor='#6366f1'; e.currentTarget.style.color='#6366f1' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.color='#94a3b8' }}>
        <span>🔍</span>
        <span style={{ flex:1, textAlign:'right' }}>חיפוש...</span>
        <span style={{ fontSize:11, background:'#e2e8f0', padding:'2px 6px', borderRadius:6 }}>⌘K</span>
      </button>

      {/* Modal חיפוש */}
      {open && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:80, backdropFilter:'blur(4px)' }}
          onClick={() => setOpen(false)}>
          <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:520, boxShadow:'0 24px 60px rgba(0,0,0,0.2)', overflow:'hidden', direction:'rtl' }}
            onClick={e => e.stopPropagation()}>

            {/* שדה חיפוש */}
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 20px', borderBottom:'1px solid #f1f5f9' }}>
              <span style={{ fontSize:18 }}>🔍</span>
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                placeholder="חפש לקוח, ציוד או השכרה..."
                style={{ flex:1, border:'none', outline:'none', fontSize:16, color:'#1e293b', background:'transparent' }} />
              {loading && <div style={{ width:16, height:16, border:'2px solid #e2e8f0', borderTop:'2px solid #6366f1', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />}
              <button onClick={() => setOpen(false)}
                style={{ background:'#f1f5f9', border:'none', borderRadius:6, padding:'4px 8px', cursor:'pointer', color:'#94a3b8', fontSize:12 }}>ESC</button>
            </div>

            {/* תוצאות */}
            <div style={{ maxHeight:360, overflowY:'auto' }}>
              {results.length === 0 && query.trim() && !loading && (
                <div style={{ padding:'40px 0', textAlign:'center', color:'#94a3b8' }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>🔍</div>
                  <div>לא נמצאו תוצאות עבור "{query}"</div>
                </div>
              )}
              {results.length === 0 && !query.trim() && (
                <div style={{ padding:'32px 20px', color:'#94a3b8', fontSize:13 }}>
                  <div style={{ marginBottom:12, fontWeight:600, color:'#475569' }}>חיפוש מהיר</div>
                  {[
                    { icon:'👤', text:'שם לקוח' },
                    { icon:'📦', text:'שם פריט ציוד' },
                    { icon:'📋', text:'הערת השכרה' },
                  ].map((h,i) => (
                    <div key={i} style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8 }}>
                      <span>{h.icon}</span><span>{h.text}</span>
                    </div>
                  ))}
                </div>
              )}
              {results.map((r, i) => (
                <div key={i} onClick={() => go(r.path)}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', cursor:'pointer', transition:'background 0.1s', borderBottom:'1px solid #f8fafc' }}
                  onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <div style={{ width:36, height:36, borderRadius:10, background:TYPE_BG[r.type], display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                    {r.icon}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14, color:'#1e293b' }}>{r.title}</div>
                    <div style={{ fontSize:12, color:'#94a3b8', marginTop:1 }}>{r.sub}</div>
                  </div>
                  <span style={{ background:TYPE_BG[r.type], color:TYPE_COLOR[r.type], fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:20 }}>
                    {TYPE_LABEL[r.type]}
                  </span>
                </div>
              ))}
            </div>

            {results.length > 0 && (
              <div style={{ padding:'10px 20px', borderTop:'1px solid #f1f5f9', fontSize:11, color:'#94a3b8', display:'flex', gap:16 }}>
                <span>↵ לחץ לניווט</span>
                <span>ESC לסגירה</span>
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </>
  )
}