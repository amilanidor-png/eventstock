import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const EMPTY = { full_name:'', company:'', email:'', phone:'', address:'', id_number:'', notes:'' }
const STATUS_LABEL = { draft:'טיוטה', confirmed:'מאושר', active:'פעיל', returned:'הוחזר', cancelled:'בוטל' }
const STATUS_COLOR = { draft:'#94a3b8', confirmed:'#f59e0b', active:'#10b981', returned:'#8b5cf6', cancelled:'#ef4444' }
const STATUS_BG    = { draft:'#f8fafc', confirmed:'#fffbeb', active:'#ecfdf5', returned:'#f5f3ff', cancelled:'#fef2f2' }

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [selected, setSelected]   = useState(null)
  const [history, setHistory]     = useState([])

  const load = async () => {
    const { data } = await supabase.from('customers').select('*').order('full_name')
    setCustomers(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const loadHistory = async (id) => {
    const { data } = await supabase.from('rentals')
      .select('id, status, start_date, end_date')
      .eq('customer_id', id).order('created_at', { ascending:false })
    setHistory(data || [])
  }

  const selectCustomer = (c) => { setSelected(c); loadHistory(c.id) }

  const save = async () => {
    if (!form.full_name || !form.phone) return alert('שם וטלפון הם שדות חובה')
    setSaving(true)
    if (form.id) await supabase.from('customers').update(form).eq('id', form.id)
    else         await supabase.from('customers').insert(form)
    await load()
    setModal(false)
    setForm(EMPTY)
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm('למחוק לקוח זה?')) return
    await supabase.from('customers').delete().eq('id', id)
    setCustomers(p => p.filter(c => c.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const filtered = customers.filter(c =>
    c.full_name.includes(search) ||
    (c.phone && c.phone.includes(search)) ||
    (c.company && c.company.includes(search))
  )

  const initials = (name) => name?.split(' ').map(w => w[0]).join('').slice(0,2) || '?'
  const avatarColor = (name) => {
    const colors = ['#6366f1','#8b5cf6','#10b981','#f59e0b','#ef4444','#3b82f6']
    return colors[(name?.charCodeAt(0) || 0) % colors.length]
  }

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
      <div style={{ width:32, height:32, border:'3px solid #e2e8f0', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ direction:'rtl', display:'flex', gap:20, height:'calc(100vh - 96px)' }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        .cust-row { transition: background 0.15s; cursor:pointer; }
        .cust-row:hover { background: #f8fafc !important; }
        .icon-btn { transition: all 0.15s; opacity:0.4; }
        .icon-btn:hover { opacity:1; transform:scale(1.1); }
      `}</style>

      {/* List */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px' }}>לקוחות</h1>
            <p style={{ color:'#94a3b8', fontSize:13, marginTop:3 }}>{customers.length} לקוחות רשומים</p>
          </div>
          <button onClick={() => { setForm(EMPTY); setModal(true) }}
            style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontWeight:700, padding:'10px 20px', borderRadius:12, cursor:'pointer', fontSize:14, boxShadow:'0 4px 12px rgba(99,102,241,0.25)', transition:'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
            + לקוח חדש
          </button>
        </div>

        <div style={{ position:'relative', marginBottom:16 }}>
          <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש לפי שם / טלפון / חברה..."
            style={{ width:'100%', background:'#fff', border:'1px solid #e2e8f0', color:'#1e293b', borderRadius:10, padding:'10px 36px 10px 14px', fontSize:13, outline:'none', boxSizing:'border-box', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }} />
        </div>

        <div style={{ flex:1, overflowY:'auto', background:'#fff', border:'1px solid #f1f5f9', borderRadius:16, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          {filtered.length === 0 && (
            <div style={{ textAlign:'center', padding:'60px 0', color:'#94a3b8' }}>
              <div style={{ fontSize:36, marginBottom:10 }}>👤</div>
              <div>לא נמצאו לקוחות</div>
            </div>
          )}
          {filtered.map((c, i) => (
            <div key={c.id} className="cust-row"
              onClick={() => selectCustomer(c)}
              style={{ display:'flex', alignItems:'center', padding:'14px 18px', borderBottom: i < filtered.length-1 ? '1px solid #f8fafc' : 'none', background: selected?.id===c.id ? '#f8fafc' : 'transparent', animation:`fadeUp 0.25s ease ${i*0.03}s both` }}>

              {/* Avatar */}
              <div style={{ width:40, height:40, borderRadius:12, background:avatarColor(c.full_name), color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, flexShrink:0, marginLeft:12 }}>
                {initials(c.full_name)}
              </div>

              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:14, color:'#1e293b' }}>{c.full_name}</div>
                <div style={{ fontSize:12, color:'#94a3b8', marginTop:1 }}>
                  {c.company ? `${c.company} · ` : ''}{c.phone}
                </div>
              </div>

              <div style={{ display:'flex', gap:4 }}>
                <button className="icon-btn" onClick={e => { e.stopPropagation(); setForm(c); setModal(true) }}
                  style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:15, padding:6 }}>✏️</button>
                <button className="icon-btn" onClick={e => { e.stopPropagation(); del(c.id) }}
                  style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:15, padding:6 }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Profile panel */}
      {selected && (
        <div style={{ width:300, background:'#fff', border:'1px solid #f1f5f9', borderRadius:16, padding:24, overflowY:'auto', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', animation:'fadeUp 0.25s ease' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
              <div style={{ width:48, height:48, borderRadius:14, background:avatarColor(selected.full_name), color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700 }}>
                {initials(selected.full_name)}
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:800, color:'#0f172a' }}>{selected.full_name}</div>
                {selected.company && <div style={{ fontSize:12, color:'#94a3b8' }}>{selected.company}</div>}
              </div>
            </div>
            <button onClick={() => setSelected(null)}
              style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'4px 8px', cursor:'pointer', color:'#94a3b8', fontSize:14 }}>✕</button>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
            {[
              { icon:'📞', label: selected.phone },
              { icon:'📧', label: selected.email },
              { icon:'🏠', label: selected.address },
              { icon:'🪪', label: selected.id_number },
            ].filter(f => f.label).map((f, i) => (
              <div key={i} style={{ display:'flex', gap:10, alignItems:'center', background:'#f8fafc', borderRadius:10, padding:'8px 12px' }}>
                <span style={{ fontSize:14 }}>{f.icon}</span>
                <span style={{ fontSize:13, color:'#475569' }}>{f.label}</span>
              </div>
            ))}
            {selected.notes && (
              <div style={{ background:'#fffbeb', border:'1px solid #fef3c7', borderRadius:10, padding:'8px 12px', fontSize:12, color:'#92400e' }}>
                📝 {selected.notes}
              </div>
            )}
          </div>

          <div style={{ fontSize:13, fontWeight:700, color:'#94a3b8', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.5px' }}>היסטוריית השכרות</div>
          {history.length === 0
            ? <div style={{ textAlign:'center', padding:'20px 0', color:'#94a3b8', fontSize:13 }}>אין השכרות עדיין</div>
            : history.map(r => (
              <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #f8fafc' }}>
                <div style={{ fontSize:12, color:'#475569' }}>{r.start_date} → {r.end_date}</div>
                <span style={{ background:STATUS_BG[r.status], color:STATUS_COLOR[r.status], padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, border:`1px solid ${STATUS_COLOR[r.status]}33` }}>
                  {STATUS_LABEL[r.status]}
                </span>
              </div>
            ))
          }
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'#fff', borderRadius:20, padding:32, width:420, maxHeight:'90vh', overflowY:'auto', direction:'rtl', boxShadow:'0 24px 60px rgba(0,0,0,0.15)', animation:'fadeUp 0.25s ease' }}>
            <h2 style={{ margin:'0 0 24px', fontSize:18, fontWeight:800, color:'#0f172a' }}>{form.id ? '✏️ עריכת לקוח' : '➕ לקוח חדש'}</h2>
            {[
              { label:'שם מלא *',   key:'full_name', type:'text',  placeholder:'ישראל ישראלי' },
              { label:'טלפון *',    key:'phone',     type:'tel',   placeholder:'050-0000000' },
              { label:'חברה',       key:'company',   type:'text',  placeholder:'שם החברה' },
              { label:'אימייל',     key:'email',     type:'email', placeholder:'email@example.com' },
              { label:'כתובת',      key:'address',   type:'text',  placeholder:'רחוב, עיר' },
              { label:'ת.ז / ח.פ', key:'id_number', type:'text',  placeholder:'000000000' },
              { label:'הערות',      key:'notes',     type:'text',  placeholder:'הערות נוספות...' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:5 }}>{f.label}</label>
                <input type={f.type} value={form[f.key]||''} placeholder={f.placeholder}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width:'100%', background:'#f8fafc', border:'1px solid #e2e8f0', color:'#1e293b', borderRadius:10, padding:'10px 12px', fontSize:14, outline:'none', boxSizing:'border-box' }}
                  onFocus={e => e.target.style.borderColor='#6366f1'}
                  onBlur={e => e.target.style.borderColor='#e2e8f0'} />
              </div>
            ))}
            <div style={{ display:'flex', gap:10, marginTop:24 }}>
              <button onClick={save} disabled={saving}
                style={{ flex:1, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontWeight:700, padding:'12px', borderRadius:12, cursor:'pointer', fontSize:15 }}>
                {saving ? 'שומר...' : 'שמור'}
              </button>
              <button onClick={() => setModal(false)}
                style={{ flex:1, background:'#f8fafc', border:'1px solid #e2e8f0', color:'#64748b', fontWeight:600, padding:'12px', borderRadius:12, cursor:'pointer', fontSize:15 }}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}