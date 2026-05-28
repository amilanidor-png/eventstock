import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const CONDS      = { excellent:'מצוין', good:'טוב', fair:'בינוני', maintenance:'תחזוקה' }
const COND_COLOR = { excellent:'#10b981', good:'#f59e0b', fair:'#f97316', maintenance:'#ef4444' }
const COND_BG    = { excellent:'#ecfdf5', good:'#fffbeb', fair:'#fff7ed', maintenance:'#fef2f2' }
const EMPTY      = { name:'', category_id:'', description:'', daily_rate:'', quantity_total:'', condition:'excellent', notes:'' }

export default function Inventory() {
  const [items, setItems]         = useState([])
  const [cats, setCats]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [search, setSearch]       = useState('')
  const [catFilter, setCatFilter] = useState('all')

  const load = async () => {
    const [{ data: eq }, { data: categories }] = await Promise.all([
      supabase.from('equipment').select('*, equipment_categories(id, name, icon)').eq('is_active', true).order('name'),
      supabase.from('equipment_categories').select('*').order('name'),
    ])
    setItems(eq || [])
    setCats(categories || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.name || !form.daily_rate || !form.quantity_total) return alert('נא למלא שדות חובה')
    setSaving(true)
    const payload = {
      name:           form.name,
      category_id:    form.category_id || null,
      description:    form.description,
      daily_rate:     +form.daily_rate,
      quantity_total: +form.quantity_total,
      condition:      form.condition,
      notes:          form.notes,
    }
    if (form.id) await supabase.from('equipment').update(payload).eq('id', form.id)
    else         await supabase.from('equipment').insert(payload)
    await load()
    setModal(false)
    setForm(EMPTY)
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm('למחוק פריט זה?')) return
    await supabase.from('equipment').update({ is_active:false }).eq('id', id)
    setItems(p => p.filter(i => i.id !== id))
  }

  const filtered = items.filter(i =>
    (catFilter === 'all' || i.category_id === catFilter) && i.name.includes(search)
  )

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
      <div style={{ width:32, height:32, border:'3px solid #e2e8f0', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ direction:'rtl' }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        .inv-card { transition: box-shadow 0.2s, transform 0.2s; }
        .inv-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important; transform: translateY(-2px); }
        .chip-btn { transition: all 0.15s; }
        .chip-btn:hover { background: #eef2ff !important; color: #6366f1 !important; }
        .icon-btn { transition: all 0.15s; opacity: 0.5; }
        .icon-btn:hover { opacity: 1; transform: scale(1.1); }
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px' }}>מלאי ציוד</h1>
          <p style={{ color:'#94a3b8', fontSize:13, marginTop:3 }}>{items.length} פריטים במלאי</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setModal(true) }}
          style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontWeight:700, padding:'10px 20px', borderRadius:12, cursor:'pointer', fontSize:14, boxShadow:'0 4px 12px rgba(99,102,241,0.25)', transition:'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
          + הוסף פריט
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:14 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש פריט..."
            style={{ background:'#fff', border:'1px solid #e2e8f0', color:'#1e293b', borderRadius:10, padding:'9px 36px 9px 14px', fontSize:13, outline:'none', width:200 }} />
        </div>
        <button className="chip-btn" onClick={() => setCatFilter('all')}
          style={{ padding:'8px 16px', borderRadius:20, border:'1px solid', fontSize:13, cursor:'pointer',
            borderColor: catFilter==='all' ? '#6366f1' : '#e2e8f0',
            background:  catFilter==='all' ? '#eef2ff' : '#fff',
            color:       catFilter==='all' ? '#6366f1' : '#64748b',
            fontWeight:  catFilter==='all' ? 700 : 400 }}>
          הכל
        </button>
        {cats.map(c => (
          <button key={c.id} className="chip-btn" onClick={() => setCatFilter(c.id)}
            style={{ padding:'8px 16px', borderRadius:20, border:'1px solid', fontSize:13, cursor:'pointer',
              borderColor: catFilter===c.id ? '#6366f1' : '#e2e8f0',
              background:  catFilter===c.id ? '#eef2ff' : '#fff',
              color:       catFilter===c.id ? '#6366f1' : '#64748b',
              fontWeight:  catFilter===c.id ? 700 : 400 }}>
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16 }}>
        {filtered.map((item, i) => (
          <div key={item.id} className="inv-card"
            style={{ background:'#fff', borderRadius:16, border:'1px solid #f1f5f9', padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.04)', animation:`fadeUp 0.3s ease ${i*0.04}s both` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <span style={{ background:COND_BG[item.condition], color:COND_COLOR[item.condition], fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, border:`1px solid ${COND_COLOR[item.condition]}33` }}>
                {CONDS[item.condition]}
              </span>
              <div style={{ display:'flex', gap:6 }}>
                <button className="icon-btn"
                  onClick={() => { setForm({ ...item, category_id: item.category_id || '' }); setModal(true) }}
                  style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:15, padding:4 }}>✏️</button>
                <button className="icon-btn" onClick={() => del(item.id)}
                  style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:15, padding:4 }}>🗑️</button>
              </div>
            </div>
            <div style={{ fontSize:16, fontWeight:700, color:'#0f172a', marginBottom:4 }}>{item.name}</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginBottom:14 }}>
              {item.equipment_categories?.icon} {item.equipment_categories?.name || '—'}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:14, borderTop:'1px solid #f8fafc' }}>
              <span style={{ fontSize:15, fontWeight:700, color:'#6366f1' }}>₪{item.daily_rate}<span style={{ fontSize:11, fontWeight:400, color:'#94a3b8' }}>/יום</span></span>
              <span style={{ fontSize:12, color:'#64748b', background:'#f8fafc', padding:'3px 10px', borderRadius:20 }}>כמות: {item.quantity_total}</span>
            </div>
            {item.notes && <div style={{ fontSize:12, color:'#94a3b8', marginTop:10, paddingTop:10, borderTop:'1px solid #f8fafc' }}>{item.notes}</div>}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#94a3b8' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📦</div>
          <div style={{ fontSize:15 }}>לא נמצאו פריטים</div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'#fff', borderRadius:20, padding:32, width:440, maxHeight:'90vh', overflowY:'auto', direction:'rtl', boxShadow:'0 24px 60px rgba(0,0,0,0.15)', animation:'fadeUp 0.25s ease' }}>
            <h2 style={{ margin:'0 0 24px', fontSize:18, fontWeight:800, color:'#0f172a' }}>{form.id ? '✏️ עריכת פריט' : '➕ פריט חדש'}</h2>

            {[
              { label:'שם הפריט *',      key:'name',           type:'text',   placeholder:'לדוגמה: מערכת שמע' },
              { label:'מחיר יומי (₪) *', key:'daily_rate',    type:'number', placeholder:'0' },
              { label:'כמות במלאי *',    key:'quantity_total', type:'number', placeholder:'0' },
              { label:'תיאור',           key:'description',    type:'text',   placeholder:'תיאור קצר...' },
              { label:'הערות',           key:'notes',          type:'text',   placeholder:'הערות פנימיות...' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:14 }}>
                <label style={lbl}>{f.label}</label>
                <input type={f.type} value={form[f.key] || ''} placeholder={f.placeholder}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width:'100%', background:'#f8fafc', border:'1px solid #e2e8f0', color:'#1e293b', borderRadius:10, padding:'10px 12px', fontSize:14, outline:'none', boxSizing:'border-box' }}
                  onFocus={e => e.target.style.borderColor='#6366f1'}
                  onBlur={e => e.target.style.borderColor='#e2e8f0'} />
              </div>
            ))}

            <div style={{ marginBottom:14 }}>
              <label style={lbl}>קטגוריה</label>
              <select value={form.category_id || ''} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
                style={{ width:'100%', background:'#f8fafc', border:'1px solid #e2e8f0', color:'#1e293b', borderRadius:10, padding:'10px 12px', fontSize:14, outline:'none' }}>
                <option value="">-- בחר קטגוריה --</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={lbl}>מצב</label>
              <select value={form.condition} onChange={e => setForm(p => ({ ...p, condition: e.target.value }))}
                style={{ width:'100%', background:'#f8fafc', border:'1px solid #e2e8f0', color:'#1e293b', borderRadius:10, padding:'10px 12px', fontSize:14, outline:'none' }}>
                {Object.entries(CONDS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

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

const lbl = { display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:5 }