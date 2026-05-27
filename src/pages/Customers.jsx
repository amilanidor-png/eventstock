import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const EMPTY = { full_name:'', company:'', email:'', phone:'', address:'', id_number:'', notes:'' }
const STATUS_LABEL = { draft:'טיוטה', confirmed:'מאושר', active:'פעיל', returned:'הוחזר', cancelled:'בוטל' }
const STATUS_COLOR = { draft:'#7a9bb5', confirmed:'#f8b942', active:'#22c55e', returned:'#a78bfa', cancelled:'#ef4444' }

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

  const loadHistory = async (customerId) => {
    const { data } = await supabase
      .from('rentals')
      .select('id, status, start_date, end_date, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
    setHistory(data || [])
  }

  const selectCustomer = (c) => {
    setSelected(c)
    loadHistory(c.id)
  }

  const save = async () => {
    if (!form.full_name || !form.phone) return alert('שם וטלפון הם שדות חובה')
    setSaving(true)
    if (form.id) {
      await supabase.from('customers').update(form).eq('id', form.id)
    } else {
      await supabase.from('customers').insert(form)
    }
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

  if (loading) return <div style={{ color:'#f8b942' }}>⏳ טוען...</div>

  return (
    <div style={{ direction:'rtl', display:'flex', gap:24, height:'calc(100vh - 96px)' }}>

      {/* List */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        <div style={s.header}>
          <h1 style={s.title}>לקוחות</h1>
          <button style={s.btn} onClick={() => { setForm(EMPTY); setModal(true) }}>+ לקוח חדש</button>
        </div>

        <input style={{ ...s.input, marginBottom:16 }} placeholder="🔍 חיפוש לפי שם / טלפון / חברה..." value={search} onChange={e => setSearch(e.target.value)} />

        <div style={s.list}>
          {filtered.length === 0 && <p style={{ color:'#4a6080', padding:16 }}>לא נמצאו לקוחות</p>}
          {filtered.map(c => (
            <div key={c.id}
              onClick={() => selectCustomer(c)}
              style={{ ...s.customerRow, ...(selected?.id === c.id ? s.customerRowActive : {}) }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:15 }}>{c.full_name}</div>
                {c.company && <div style={{ fontSize:12, color:'#4a6080' }}>{c.company}</div>}
                <div style={{ fontSize:12, color:'#4a6080' }}>{c.phone}</div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button style={s.iconBtn} onClick={e => { e.stopPropagation(); setForm(c); setModal(true) }}>✏️</button>
                <button style={s.iconBtn} onClick={e => { e.stopPropagation(); del(c.id) }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Profile panel */}
      {selected && (
        <div style={s.panel}>
          <div style={s.panelHeader}>
            <div>
              <div style={{ fontSize:20, fontWeight:800 }}>{selected.full_name}</div>
              {selected.company && <div style={{ fontSize:13, color:'#4a6080' }}>{selected.company}</div>}
            </div>
            <button style={s.iconBtn} onClick={() => setSelected(null)}>✕</button>
          </div>

          <div style={s.panelInfo}>
            {[
              { label:'📞 טלפון',    value: selected.phone },
              { label:'📧 אימייל',   value: selected.email },
              { label:'🏠 כתובת',    value: selected.address },
              { label:'🪪 ת.ז/ח.פ', value: selected.id_number },
            ].filter(f => f.value).map(f => (
              <div key={f.label} style={s.infoRow}>
                <span style={{ color:'#4a6080', fontSize:13 }}>{f.label}</span>
                <span style={{ fontSize:13 }}>{f.value}</span>
              </div>
            ))}
            {selected.notes && (
              <div style={{ fontSize:12, color:'#4a6080', borderTop:'1px solid #1a2535', paddingTop:10, marginTop:4 }}>
                {selected.notes}
              </div>
            )}
          </div>

          <h3 style={{ fontSize:14, fontWeight:700, margin:'16px 0 10px', color:'#7a9bb5' }}>היסטוריית השכרות</h3>
          {history.length === 0
            ? <p style={{ color:'#4a6080', fontSize:13 }}>אין השכרות</p>
            : history.map(r => (
              <div key={r.id} style={s.histRow}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{r.start_date} → {r.end_date}</div>
                </div>
                <span style={{ background: STATUS_COLOR[r.status]+'22', color: STATUS_COLOR[r.status], padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600 }}>
                  {STATUS_LABEL[r.status]}
                </span>
              </div>
            ))
          }
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h2 style={s.modalTitle}>{form.id ? 'עריכת לקוח' : 'לקוח חדש'}</h2>
            {[
              { label:'שם מלא *',    key:'full_name',  type:'text' },
              { label:'טלפון *',     key:'phone',      type:'tel' },
              { label:'חברה',        key:'company',    type:'text' },
              { label:'אימייל',      key:'email',      type:'email' },
              { label:'כתובת',       key:'address',    type:'text' },
              { label:'ת.ז / ח.פ',  key:'id_number',  type:'text' },
              { label:'הערות',       key:'notes',      type:'text' },
            ].map(f => (
              <div key={f.key} style={s.field}>
                <label style={s.label}>{f.label}</label>
                <input style={s.minput} type={f.type} value={form[f.key] || ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
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
  header:          { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  title:           { margin:0, fontSize:26, fontWeight:800 },
  input:           { background:'#111827', border:'1px solid #1e2d40', color:'#e8edf5', borderRadius:8, padding:'8px 14px', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' },
  list:            { flex:1, overflowY:'auto', background:'#111827', border:'1px solid #1e2d40', borderRadius:14 },
  customerRow:     { display:'flex', alignItems:'center', padding:'14px 16px', borderBottom:'1px solid #1a2535', cursor:'pointer', transition:'background 0.15s' },
  customerRowActive:{ background:'#1e2d40' },
  panel:           { width:320, background:'#111827', border:'1px solid #1e2d40', borderRadius:14, padding:20, overflowY:'auto' },
  panelHeader:     { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, paddingBottom:16, borderBottom:'1px solid #1a2535' },
  panelInfo:       { display:'flex', flexDirection:'column', gap:8 },
  infoRow:         { display:'flex', justifyContent:'space-between', gap:8 },
  histRow:         { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #1a2535' },
  iconBtn:         { background:'transparent', border:'none', cursor:'pointer', fontSize:16 },
  btn:             { background:'linear-gradient(135deg,#f8b942,#f57c00)', border:'none', color:'#0a0f1a', fontWeight:700, padding:'10px 22px', borderRadius:10, cursor:'pointer', fontSize:14 },
  btnGhost:        { background:'#1e2d40', border:'none', color:'#7a9bb5', fontWeight:600, padding:'10px 22px', borderRadius:10, cursor:'pointer', fontSize:14 },
  overlay:         { position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
  modal:           { background:'#111827', border:'1px solid #1e2d40', borderRadius:16, padding:32, width:420, maxHeight:'90vh', overflowY:'auto', direction:'rtl' },
  modalTitle:      { margin:'0 0 20px', fontSize:18, fontWeight:800 },
  field:           { marginBottom:12 },
  label:           { display:'block', fontSize:13, color:'#7a9bb5', marginBottom:5 },
  minput:          { width:'100%', background:'#0a0f1a', border:'1px solid #1e2d40', color:'#e8edf5', borderRadius:8, padding:'10px 12px', fontSize:14, outline:'none', boxSizing:'border-box' },
  modalBtns:       { display:'flex', gap:10, marginTop:20 },
}