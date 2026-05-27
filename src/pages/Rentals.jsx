import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const STATUS_LABEL = { draft:'טיוטה', confirmed:'מאושר', active:'פעיל', returned:'הוחזר', cancelled:'בוטל' }
const STATUS_COLOR = { draft:'#7a9bb5', confirmed:'#f8b942', active:'#22c55e', returned:'#a78bfa', cancelled:'#ef4444' }

const EMPTY_FORM = { customer_id:'', start_date:'', end_date:'', pickup_type:'pickup', delivery_address:'', discount:'0', deposit_amount:'0', notes:'' }

export default function Rentals() {
  const [rentals, setRentals]     = useState([])
  const [customers, setCustomers] = useState([])
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [lines, setLines]         = useState([{ equipment_id:'', quantity:1 }])
  const [saving, setSaving]       = useState(false)
  const [filterStatus, setFilter] = useState('all')

  const load = async () => {
    const [{ data: r }, { data: c }, { data: e }] = await Promise.all([
      supabase.from('rentals').select('*, customers(full_name)').order('created_at', { ascending:false }),
      supabase.from('customers').select('id, full_name').order('full_name'),
      supabase.from('equipment').select('id, name, daily_rate').eq('is_active', true).order('name'),
    ])
    setRentals(r || [])
    setCustomers(c || [])
    setEquipment(e || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const addLine = () => setLines(p => [...p, { equipment_id:'', quantity:1 }])
  const removeLine = i => setLines(p => p.filter((_, idx) => idx !== i))
  const updateLine = (i, key, val) => setLines(p => p.map((l, idx) => idx === i ? { ...l, [key]: val } : l))

  const calcTotal = () => {
    if (!form.start_date || !form.end_date) return 0
    const days = Math.max(1, Math.ceil((new Date(form.end_date) - new Date(form.start_date)) / 86400000) + 1)
    return lines.reduce((sum, l) => {
      const eq = equipment.find(e => e.id === l.equipment_id)
      return sum + (eq ? eq.daily_rate * +l.quantity * days : 0)
    }, 0) - +form.discount
  }

  const save = async () => {
    if (!form.customer_id || !form.start_date || !form.end_date) return alert('נא למלא שדות חובה')
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: rental, error } = await supabase.from('rentals').insert({
      ...form, discount: +form.discount, deposit_amount: +form.deposit_amount, created_by: user.id
    }).select().single()
    if (error) { alert('שגיאה: ' + error.message); setSaving(false); return }

    const validLines = lines.filter(l => l.equipment_id)
    for (const l of validLines) {
      const eq = equipment.find(e => e.id === l.equipment_id)
      await supabase.from('rental_items').insert({ rental_id: rental.id, equipment_id: l.equipment_id, quantity: +l.quantity, daily_rate: eq.daily_rate })
    }
    await load()
    setModal(false)
    setForm(EMPTY_FORM)
    setLines([{ equipment_id:'', quantity:1 }])
    setSaving(false)
  }

  const updateStatus = async (id, status) => {
    await supabase.from('rentals').update({ status }).eq('id', id)
    setRentals(p => p.map(r => r.id === id ? { ...r, status } : r))
  }

  const filtered = rentals.filter(r => filterStatus === 'all' || r.status === filterStatus)

  if (loading) return <div style={{ color:'#f8b942' }}>⏳ טוען...</div>

  return (
    <div style={{ direction:'rtl' }}>
      <div style={s.header}>
        <h1 style={s.title}>השכרות</h1>
        <button style={s.btn} onClick={() => { setForm(EMPTY_FORM); setLines([{ equipment_id:'', quantity:1 }]); setModal(true) }}>+ השכרה חדשה</button>
      </div>

      {/* Filter */}
      <div style={s.filters}>
        {['all', ...Object.keys(STATUS_LABEL)].map(st => (
          <button key={st} onClick={() => setFilter(st)}
            style={{ ...s.chip, ...(filterStatus === st ? s.chipActive : {}) }}>
            {st === 'all' ? 'הכל' : STATUS_LABEL[st]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={s.table}>
        {filtered.length === 0
          ? <p style={{ color:'#4a6080', padding:16 }}>אין השכרות</p>
          : filtered.map(r => (
            <div key={r.id} style={s.row}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:15 }}>{r.customers?.full_name || '—'}</div>
                <div style={{ fontSize:12, color:'#4a6080', marginTop:2 }}>{r.start_date} → {r.end_date}</div>
                {r.notes && <div style={{ fontSize:12, color:'#4a6080', marginTop:2 }}>{r.notes}</div>}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <select
                  value={r.status}
                  onChange={e => updateStatus(r.id, e.target.value)}
                  style={{ background: STATUS_COLOR[r.status]+'22', color: STATUS_COLOR[r.status], border:'none', borderRadius:20, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  {Object.entries(STATUS_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
          ))
        }
      </div>

      {/* Modal */}
      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h2 style={s.modalTitle}>השכרה חדשה</h2>

            <div style={s.field}>
              <label style={s.label}>לקוח *</label>
              <select style={s.minput} value={form.customer_id} onChange={e => setForm(p => ({ ...p, customer_id: e.target.value }))}>
                <option value="">-- בחר לקוח --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={s.field}>
                <label style={s.label}>מתאריך *</label>
                <input style={s.minput} type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div style={s.field}>
                <label style={s.label}>עד תאריך *</label>
                <input style={s.minput} type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>אופן איסוף</label>
              <select style={s.minput} value={form.pickup_type} onChange={e => setForm(p => ({ ...p, pickup_type: e.target.value }))}>
                <option value="pickup">איסוף עצמי</option>
                <option value="delivery">משלוח</option>
              </select>
            </div>

            {form.pickup_type === 'delivery' && (
              <div style={s.field}>
                <label style={s.label}>כתובת למשלוח</label>
                <input style={s.minput} type="text" value={form.delivery_address} onChange={e => setForm(p => ({ ...p, delivery_address: e.target.value }))} />
              </div>
            )}

            {/* Equipment lines */}
            <div style={s.field}>
              <label style={s.label}>פריטים</label>
              {lines.map((l, i) => (
                <div key={i} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'center' }}>
                  <select style={{ ...s.minput, flex:2 }} value={l.equipment_id} onChange={e => updateLine(i, 'equipment_id', e.target.value)}>
                    <option value="">-- בחר פריט --</option>
                    {equipment.map(e => <option key={e.id} value={e.id}>{e.name} (₪{e.daily_rate}/יום)</option>)}
                  </select>
                  <input style={{ ...s.minput, flex:0.5 }} type="number" min="1" value={l.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                  {lines.length > 1 && <button style={s.iconBtn} onClick={() => removeLine(i)}>✕</button>}
                </div>
              ))}
              <button style={s.btnGhost} onClick={addLine}>+ פריט נוסף</button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={s.field}>
                <label style={s.label}>הנחה (₪)</label>
                <input style={s.minput} type="number" value={form.discount} onChange={e => setForm(p => ({ ...p, discount: e.target.value }))} />
              </div>
              <div style={s.field}>
                <label style={s.label}>מקדמה (₪)</label>
                <input style={s.minput} type="number" value={form.deposit_amount} onChange={e => setForm(p => ({ ...p, deposit_amount: e.target.value }))} />
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>הערות</label>
              <input style={s.minput} type="text" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>

            <div style={{ ...s.field, background:'#0a0f1a', borderRadius:8, padding:12, textAlign:'center' }}>
              <span style={{ color:'#4a6080', fontSize:13 }}>סה״כ לתשלום: </span>
              <span style={{ color:'#f8b942', fontWeight:800, fontSize:20 }}>₪{calcTotal().toFixed(2)}</span>
            </div>

            <div style={s.modalBtns}>
              <button style={s.btn} onClick={save} disabled={saving}>{saving ? 'שומר...' : 'צור השכרה'}</button>
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
  filters:   { display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' },
  chip:      { padding:'7px 14px', borderRadius:20, border:'1px solid #1e2d40', background:'transparent', color:'#7a9bb5', cursor:'pointer', fontSize:13 },
  chipActive:{ background:'#f8b942', color:'#0a0f1a', fontWeight:700, borderColor:'#f8b942' },
  table:     { background:'#111827', border:'1px solid #1e2d40', borderRadius:14, overflow:'hidden' },
  row:       { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', borderBottom:'1px solid #1a2535' },
  btn:       { background:'linear-gradient(135deg,#f8b942,#f57c00)', border:'none', color:'#0a0f1a', fontWeight:700, padding:'10px 22px', borderRadius:10, cursor:'pointer', fontSize:14 },
  btnGhost:  { background:'#1e2d40', border:'none', color:'#7a9bb5', fontWeight:600, padding:'10px 22px', borderRadius:10, cursor:'pointer', fontSize:14 },
  overlay:   { position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
  modal:     { background:'#111827', border:'1px solid #1e2d40', borderRadius:16, padding:32, width:480, maxHeight:'90vh', overflowY:'auto', direction:'rtl' },
  modalTitle:{ margin:'0 0 20px', fontSize:18, fontWeight:800 },
  field:     { marginBottom:12 },
  label:     { display:'block', fontSize:13, color:'#7a9bb5', marginBottom:5 },
  minput:    { width:'100%', background:'#0a0f1a', border:'1px solid #1e2d40', color:'#e8edf5', borderRadius:8, padding:'10px 12px', fontSize:14, outline:'none', boxSizing:'border-box' },
  modalBtns: { display:'flex', gap:10, marginTop:20 },
  iconBtn:   { background:'transparent', border:'none', color:'#ef4444', cursor:'pointer', fontSize:16, fontWeight:700 },
}