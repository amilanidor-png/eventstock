import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const CATS = { av:'AV', lighting:'תאורה', tent:'אוהלים', furniture:'ריהוט', other:'אחר' }
const CONDS = { excellent:'מצוין', good:'טוב', fair:'בינוני', maintenance:'תחזוקה' }
const COND_COLOR = { excellent:'#22c55e', good:'#f8b942', fair:'#f97316', maintenance:'#ef4444' }
const EMPTY = { name:'', category:'av', description:'', daily_rate:'', quantity_total:'', condition:'excellent', notes:'' }

export default function Inventory() {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState(false)
  const [form, setForm]     = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [cat, setCat]       = useState('all')

  const load = async () => {
    const { data } = await supabase.from('equipment').select('*').eq('is_active', true).order('name')
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    const payload = { ...form, daily_rate: +form.daily_rate, quantity_total: +form.quantity_total }
    if (form.id) {
      await supabase.from('equipment').update(payload).eq('id', form.id)
    } else {
      await supabase.from('equipment').insert(payload)
    }
    await load()
    setModal(false)
    setForm(EMPTY)
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm('למחוק פריט זה?')) return
    await supabase.from('equipment').update({ is_active: false }).eq('id', id)
    setItems(p => p.filter(i => i.id !== id))
  }

  const filtered = items.filter(i =>
    (cat === 'all' || i.category === cat) &&
    i.name.includes(search)
  )

  if (loading) return <div style={{ color:'#f8b942' }}>⏳ טוען...</div>

  return (
    <div style={{ direction:'rtl' }}>
      <div style={s.header}>
        <h1 style={s.title}>מלאי ציוד</h1>
        <button style={s.btn} onClick={() => { setForm(EMPTY); setModal(true) }}>+ הוסף פריט</button>
      </div>

      {/* Filters */}
      <div style={s.filters}>
        <input style={s.input} placeholder="🔍 חיפוש..." value={search} onChange={e => setSearch(e.target.value)} />
        {['all', ...Object.keys(CATS)].map(c => (
          <button key={c} onClick={() => setCat(c)}
            style={{ ...s.chip, ...(cat === c ? s.chipActive : {}) }}>
            {c === 'all' ? 'הכל' : CATS[c]}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={s.grid}>
        {filtered.map(item => (
          <div key={item.id} style={s.card}>
            <div style={s.cardTop}>
              <span style={{ background: COND_COLOR[item.condition]+'22', color: COND_COLOR[item.condition], fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20 }}>
                {CONDS[item.condition]}
              </span>
              <div style={{ display:'flex', gap:8 }}>
                <button style={s.iconBtn} onClick={() => { setForm(item); setModal(true) }}>✏️</button>
                <button style={s.iconBtn} onClick={() => del(item.id)}>🗑️</button>
              </div>
            </div>
            <div style={s.cardName}>{item.name}</div>
            <div style={s.cardCat}>{CATS[item.category]}</div>
            <div style={s.cardRow}>
              <span style={{ color:'#f8b942', fontWeight:700 }}>₪{item.daily_rate}/יום</span>
              <span style={{ color:'#7a9bb5', fontSize:13 }}>כמות: {item.quantity_total}</span>
            </div>
            {item.notes && <div style={s.cardNote}>{item.notes}</div>}
          </div>
        ))}
      </div>

      {filtered.length === 0 && <p style={{ color:'#4a6080' }}>לא נמצאו פריטים</p>}

      {/* Modal */}
      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h2 style={s.modalTitle}>{form.id ? 'עריכת פריט' : 'פריט חדש'}</h2>

            {[
              { label:'שם הפריט *', key:'name', type:'text' },
              { label:'מחיר יומי (₪) *', key:'daily_rate', type:'number' },
              { label:'כמות במלאי *', key:'quantity_total', type:'number' },
              { label:'תיאור', key:'description', type:'text' },
              { label:'הערות', key:'notes', type:'text' },
            ].map(f => (
              <div key={f.key} style={s.field}>
                <label style={s.label}>{f.label}</label>
                <input style={s.minput} type={f.type} value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}

            <div style={s.field}>
              <label style={s.label}>קטגוריה</label>
              <select style={s.minput} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {Object.entries(CATS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div style={s.field}>
              <label style={s.label}>מצב</label>
              <select style={s.minput} value={form.condition} onChange={e => setForm(p => ({ ...p, condition: e.target.value }))}>
                {Object.entries(CONDS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div style={s.modalBtns}>
              <button style={s.btn} onClick={save} disabled={saving}>{saving ? 'שומר...' : 'שמור'}</button>
              <button style={s.btnGhost} onClick={() => setModal(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  header:    { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  title:     { margin:0, fontSize:26, fontWeight:800 },
  filters:   { display:'flex', gap:8, marginBottom:24, flexWrap:'wrap', alignItems:'center' },
  input:     { background:'#111827', border:'1px solid #1e2d40', color:'#e8edf5', borderRadius:8, padding:'8px 14px', fontSize:13, outline:'none' },
  chip:      { padding:'7px 14px', borderRadius:20, border:'1px solid #1e2d40', background:'transparent', color:'#7a9bb5', cursor:'pointer', fontSize:13 },
  chipActive:{ background:'#f8b942', color:'#0a0f1a', fontWeight:700, borderColor:'#f8b942' },
  grid:      { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:16 },
  card:      { background:'#111827', border:'1px solid #1e2d40', borderRadius:14, padding:20, display:'flex', flexDirection:'column', gap:8 },
  cardTop:   { display:'flex', justifyContent:'space-between', alignItems:'center' },
  cardName:  { fontWeight:700, fontSize:16 },
  cardCat:   { fontSize:12, color:'#4a6080' },
  cardRow:   { display:'flex', justifyContent:'space-between' },
  cardNote:  { fontSize:12, color:'#4a6080', borderTop:'1px solid #1a2535', paddingTop:8 },
  iconBtn:   { background:'transparent', border:'none', cursor:'pointer', fontSize:16 },
  btn:       { background:'linear-gradient(135deg,#f8b942,#f57c00)', border:'none', color:'#0a0f1a', fontWeight:700, padding:'10px 22px', borderRadius:10, cursor:'pointer', fontSize:14 },
  btnGhost:  { background:'#1e2d40', border:'none', color:'#7a9bb5', fontWeight:600, padding:'10px 22px', borderRadius:10, cursor:'pointer', fontSize:14 },
  overlay:   { position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
  modal:     { background:'#111827', border:'1px solid #1e2d40', borderRadius:16, padding:32, width:420, maxHeight:'90vh', overflowY:'auto', direction:'rtl' },
  modalTitle:{ margin:'0 0 20px', fontSize:18, fontWeight:800 },
  field:     { marginBottom:12 },
  label:     { display:'block', fontSize:13, color:'#7a9bb5', marginBottom:5 },
  minput:    { width:'100%', background:'#0a0f1a', border:'1px solid #1e2d40', color:'#e8edf5', borderRadius:8, padding:'10px 12px', fontSize:14, outline:'none', boxSizing:'border-box' },
  modalBtns: { display:'flex', gap:10, marginTop:20 },
}