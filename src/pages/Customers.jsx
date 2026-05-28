import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const T = {
  bg:'#0d0d0d', surface:'#161616', card:'#1a1a1a', border:'#2a2a2a',
  red:'#e53935', redDark:'#b71c1c', redGlow:'rgba(229,57,53,0.18)',
  text:'#f0f0f0', muted:'#888',
  neo:'inset 2px 2px 5px rgba(0,0,0,0.6), inset -2px -2px 5px rgba(255,255,255,0.04)',
  neoOut:'4px 4px 10px rgba(0,0,0,0.6), -2px -2px 6px rgba(255,255,255,0.03)',
}

const STATUS_LABEL = { draft:'טיוטה', confirmed:'מאושר', active:'פעיל', returned:'הוחזר', cancelled:'בוטל' }
const STATUS_COLOR = { draft:'#555', confirmed:'#f59e0b', active:'#10b981', returned:'#8b5cf6', cancelled:T.red }
const EMPTY = { full_name:'', company:'', email:'', phone:'', address:'', id_number:'', notes:'' }

const inp = { width:'100%', background:'#111', border:`1px solid #333`, color:T.text, borderRadius:10, padding:'11px 14px', fontSize:14, outline:'none', boxSizing:'border-box', transition:'all 0.2s' }
const lbl = { display:'block', fontSize:11, fontWeight:700, color:T.muted, marginBottom:6, letterSpacing:1.5, textTransform:'uppercase' }

const AVATAR_COLORS = ['#e53935','#8b5cf6','#10b981','#f59e0b','#3b82f6','#ec4899']
const avatarColor   = name => AVATAR_COLORS[(name?.charCodeAt(0)||0) % AVATAR_COLORS.length]
const initials      = name => name?.split(' ').map(w=>w[0]).join('').slice(0,2) || '?'

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
    setCustomers(data||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const loadHistory = async (id) => {
    const { data } = await supabase.from('rentals').select('id, status, start_date, end_date').eq('customer_id', id).order('created_at', { ascending:false })
    setHistory(data||[])
  }

  const selectCustomer = (c) => { setSelected(c); loadHistory(c.id) }

  const save = async () => {
    if (!form.full_name) return alert('שם הוא שדה חובה')
    setSaving(true)
    if (form.id) await supabase.from('customers').update(form).eq('id', form.id)
    else         await supabase.from('customers').insert(form)
    await load()
    setModal(false); setForm(EMPTY); setSaving(false)
  }

  const del = async (id) => {
    if (!confirm('למחוק לקוח זה?')) return
    await supabase.from('customers').delete().eq('id', id)
    setCustomers(p => p.filter(c => c.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const filtered = customers.filter(c =>
    c.full_name.includes(search) || (c.phone&&c.phone.includes(search)) || (c.company&&c.company.includes(search))
  )

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:80 }}>
      <div style={{ width:36, height:36, border:`3px solid ${T.border}`, borderTop:`3px solid ${T.red}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ direction:'rtl', color:T.text, display:'flex', gap:20, height:'calc(100vh - 96px)' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .cust-row{transition:background 0.15s;cursor:pointer;}
        .cust-row:hover{background:rgba(229,57,53,0.06)!important;}
        .icon-btn{transition:all 0.15s;opacity:0.3;background:transparent;border:none;cursor:pointer;font-size:15px;padding:4px;}
        .icon-btn:hover{opacity:1;transform:scale(1.2);}
        .neo-input:focus{border-color:${T.red}!important;box-shadow:${T.neo},0 0 0 3px ${T.redGlow}!important;}
      `}</style>

      {/* List */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
              <div style={{ width:4, height:28, background:`linear-gradient(${T.red},${T.redDark})`, borderRadius:4 }} />
              <h1 style={{ fontSize:26, fontWeight:900, color:T.text, letterSpacing:1 }}>לקוחות</h1>
            </div>
            <p style={{ color:T.muted, fontSize:13, paddingRight:16 }}>{customers.length} לקוחות רשומים</p>
          </div>
          <button className="neo-btn" onClick={() => { setForm(EMPTY); setModal(true) }}
            style={{ padding:'11px 22px', fontSize:14, borderRadius:12 }}>
            + לקוח חדש
          </button>
        </div>

        <div style={{ position:'relative', marginBottom:16 }}>
          <span style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', color:T.muted }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש לפי שם / טלפון / חברה..."
            className="neo-input"
            style={{ ...inp, paddingRight:40, background:T.card, boxShadow:T.neo }} />
        </div>

        <div style={{ flex:1, overflowY:'auto', background:T.card, border:`1px solid ${T.border}`, borderRadius:16, boxShadow:T.neoOut }}>
          {filtered.length === 0 && (
            <div style={{ textAlign:'center', padding:'60px 0', color:T.muted }}>
              <div style={{ fontSize:36, marginBottom:10, opacity:0.3 }}>👤</div>
              <div style={{ letterSpacing:1 }}>לא נמצאו לקוחות</div>
            </div>
          )}
          {filtered.map((c, i) => (
            <div key={c.id} className="cust-row"
              onClick={() => selectCustomer(c)}
              style={{ display:'flex', alignItems:'center', padding:'14px 18px', borderBottom: i<filtered.length-1 ? `1px solid ${T.border}` : 'none', background: selected?.id===c.id ? T.redGlow : 'transparent', animation:`fadeUp 0.25s ease ${i*0.03}s both` }}>
              <div style={{ width:42, height:42, borderRadius:12, background:avatarColor(c.full_name), color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, flexShrink:0, marginLeft:14, boxShadow:`0 4px 12px ${avatarColor(c.full_name)}44` }}>
                {initials(c.full_name)}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:14, color:T.text }}>{c.full_name}</div>
                <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>
                  {c.company ? `${c.company} · ` : ''}{c.phone}
                </div>
              </div>
              <div style={{ display:'flex', gap:4 }}>
                <button className="icon-btn" onClick={e => { e.stopPropagation(); setForm(c); setModal(true) }}>✏️</button>
                <button className="icon-btn" onClick={e => { e.stopPropagation(); del(c.id) }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Profile panel */}
      {selected && (
        <div style={{ width:300, background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:22, overflowY:'auto', boxShadow:`${T.neoOut}, 0 0 30px ${T.redGlow}`, animation:'fadeUp 0.25s ease' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
              <div style={{ width:50, height:50, borderRadius:14, background:avatarColor(selected.full_name), color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, boxShadow:`0 6px 16px ${avatarColor(selected.full_name)}55` }}>
                {initials(selected.full_name)}
              </div>
              <div>
                <div style={{ fontSize:15, fontWeight:800, color:T.text }}>{selected.full_name}</div>
                {selected.company && <div style={{ fontSize:11, color:T.muted }}>{selected.company}</div>}
              </div>
            </div>
            <button className="icon-btn" onClick={() => setSelected(null)} style={{ opacity:0.4, fontSize:14 }}>✕</button>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:18 }}>
            {[
              { icon:'📞', val: selected.phone },
              { icon:'📧', val: selected.email },
              { icon:'🏠', val: selected.address },
              { icon:'🪪', val: selected.id_number },
            ].filter(f => f.val).map((f,i) => (
              <div key={i} style={{ display:'flex', gap:10, alignItems:'center', background:T.surface, borderRadius:10, padding:'8px 12px', border:`1px solid ${T.border}` }}>
                <span style={{ fontSize:13 }}>{f.icon}</span>
                <span style={{ fontSize:12, color:T.muted }}>{f.val}</span>
              </div>
            ))}
            {selected.notes && (
              <div style={{ background:`rgba(229,57,53,0.08)`, border:`1px solid rgba(229,57,53,0.2)`, borderRadius:10, padding:'8px 12px', fontSize:11, color:T.red }}>
                📝 {selected.notes}
              </div>
            )}
          </div>

          <div style={{ fontSize:10, fontWeight:700, color:T.muted, marginBottom:10, letterSpacing:2, textTransform:'uppercase' }}>היסטוריית השכרות</div>
          {history.length === 0
            ? <div style={{ textAlign:'center', padding:'20px 0', color:T.muted, fontSize:12 }}>אין השכרות</div>
            : history.map(r => (
              <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
                <div style={{ fontSize:11, color:T.muted }}>{r.start_date} → {r.end_date}</div>
                <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20, background:`${STATUS_COLOR[r.status]}22`, color:STATUS_COLOR[r.status] }}>
                  {STATUS_LABEL[r.status]}
                </span>
              </div>
            ))
          }
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(6px)' }}>
          <div style={{ background:T.surface, borderRadius:20, padding:32, width:420, maxHeight:'90vh', overflowY:'auto', direction:'rtl', boxShadow:`0 24px 60px rgba(0,0,0,0.9), 0 0 40px ${T.redGlow}`, border:`1px solid ${T.border}`, animation:'fadeUp 0.25s ease' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
              <div style={{ width:4, height:22, background:`linear-gradient(${T.red},${T.redDark})`, borderRadius:4 }} />
              <h2 style={{ margin:0, fontSize:17, fontWeight:900, color:T.text }}>{form.id ? 'עריכת לקוח' : 'לקוח חדש'}</h2>
            </div>
            {[
              { label:'שם מלא *', key:'full_name', type:'text',  ph:'ישראל ישראלי' },
              { label:'טלפון',    key:'phone',     type:'tel',   ph:'050-0000000' },
              { label:'חברה',     key:'company',   type:'text',  ph:'שם החברה' },
              { label:'אימייל',   key:'email',     type:'email', ph:'email@example.com' },
              { label:'כתובת',    key:'address',   type:'text',  ph:'רחוב, עיר' },
              { label:'ת.ז/ח.פ', key:'id_number', type:'text',  ph:'000000000' },
              { label:'הערות',    key:'notes',     type:'text',  ph:'הערות נוספות...' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:14 }}>
                <label style={lbl}>{f.label}</label>
                <input type={f.type} value={form[f.key]||''} placeholder={f.ph}
                  className="neo-input"
                  onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))}
                  style={{ ...inp, background:T.card, boxShadow:T.neo }}
                  onFocus={e => e.target.style.borderColor=T.red}
                  onBlur={e => e.target.style.borderColor=T.border} />
              </div>
            ))}
            <div style={{ display:'flex', gap:10, marginTop:24 }}>
              <button className="neo-btn" onClick={save} disabled={saving}
                style={{ flex:1, padding:'13px', fontSize:15, borderRadius:12 }}>
                {saving ? 'שומר...' : 'שמור'}
              </button>
              <button onClick={() => setModal(false)}
                style={{ flex:1, background:T.card, border:`1px solid ${T.border}`, color:T.muted, fontWeight:600, padding:'13px', borderRadius:12, cursor:'pointer', fontSize:15, boxShadow:T.neoOut, transition:'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor=T.red}
                onMouseLeave={e => e.currentTarget.style.borderColor=T.border}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}