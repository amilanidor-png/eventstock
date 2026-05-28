import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const STATUS_LABEL = { draft:'טיוטה', confirmed:'מאושר', active:'פעיל', returned:'הוחזר', cancelled:'בוטל' }
const STATUS_COLOR = { draft:'#94a3b8', confirmed:'#f59e0b', active:'#10b981', returned:'#8b5cf6', cancelled:'#ef4444' }
const STATUS_BG    = { draft:'#f8fafc', confirmed:'#fffbeb', active:'#ecfdf5', returned:'#f5f3ff', cancelled:'#fef2f2' }
const EMPTY_FORM   = { customer_id:'', start_date:'', end_date:'', pickup_type:'pickup', delivery_address:'', delivery_price:'0', assembly_price:'0', discount:'0', deposit_amount:'0', notes:'' }

export default function Rentals() {
  const [rentals, setRentals]           = useState([])
  const [customers, setCustomers]       = useState([])
  const [equipment, setEquipment]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [modal, setModal]               = useState(false)
  const [editId, setEditId]             = useState(null)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [lines, setLines]               = useState([{ equipment_id:'', quantity:1 }])
  const [saving, setSaving]             = useState(false)
  const [filterStatus, setFilter]       = useState('all')
  const [availability, setAvailability] = useState({})
  const [availLoading, setAvailLoading] = useState(false)

  const load = async () => {
    const [{ data:r }, { data:c }, { data:e }] = await Promise.all([
      supabase.from('rentals').select('*, customers(full_name)').order('created_at', { ascending:false }),
      supabase.from('customers').select('id, full_name').order('full_name'),
      supabase.from('equipment').select('id, name, daily_rate, quantity_total').eq('is_active', true).order('name'),
    ])
    setRentals(r || [])
    setCustomers(c || [])
    setEquipment(e || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!form.start_date || !form.end_date || !modal) return
    const check = async () => {
      setAvailLoading(true)
      const results = {}
      for (const eq of equipment) {
        const { data, error } = await supabase.rpc('get_available_quantity', {
          p_equipment_id:      eq.id,
          p_start_date:        form.start_date,
          p_end_date:          form.end_date,
          p_exclude_rental_id: editId || null,
        })
        results[eq.id] = error ? eq.quantity_total : data
      }
      setAvailability(results)
      setAvailLoading(false)
    }
    check()
  }, [form.start_date, form.end_date, modal])

  const openNew = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setLines([{ equipment_id:'', quantity:1 }])
    setAvailability({})
    setModal(true)
  }

  const openEdit = async (r) => {
    setEditId(r.id)
    setForm({
      customer_id:      r.customer_id,
      start_date:       r.start_date,
      end_date:         r.end_date,
      pickup_type:      r.pickup_type,
      delivery_address: r.delivery_address || '',
      delivery_price:   String(r.delivery_price || 0),
      assembly_price:   String(r.assembly_price || 0),
      discount:         String(r.discount || 0),
      deposit_amount:   String(r.deposit_amount || 0),
      notes:            r.notes || '',
    })
    const { data: items } = await supabase.from('rental_items').select('equipment_id, quantity').eq('rental_id', r.id)
    setLines(items?.length ? items : [{ equipment_id:'', quantity:1 }])
    setAvailability({})
    setModal(true)
  }

  const addLine    = () => setLines(p => [...p, { equipment_id:'', quantity:1 }])
  const removeLine = i  => setLines(p => p.filter((_,idx) => idx !== i))
  const updateLine = (i,k,v) => setLines(p => p.map((l,idx) => idx===i ? {...l,[k]:v} : l))

  const checkConflicts = () => lines.filter(l => l.equipment_id).reduce((arr, l) => {
    const eq = equipment.find(e => e.id === l.equipment_id)
    const av = availability[l.equipment_id]
    if (av !== undefined && +l.quantity > av) arr.push(`❌ ${eq.name}: ביקשת ${l.quantity}, זמין רק ${av}`)
    return arr
  }, [])

  const calcSubtotal = () => {
    if (!form.start_date || !form.end_date) return 0
    const days = Math.max(1, Math.ceil((new Date(form.end_date) - new Date(form.start_date)) / 86400000) + 1)
    const itemsTotal = lines.reduce((s,l) => {
      const eq = equipment.find(e => e.id === l.equipment_id)
      return s + (eq ? eq.daily_rate * +l.quantity * days : 0)
    }, 0)
    return itemsTotal + +form.delivery_price + +form.assembly_price - +form.discount
  }
  const calcVAT   = () => calcSubtotal() * 0.18
  const calcTotal = () => calcSubtotal() * 1.18

  const save = async () => {
    if (!form.customer_id || !form.start_date || !form.end_date) return alert('נא למלא שדות חובה')
    const conflicts = checkConflicts()
    if (conflicts.length > 0) return alert('⚠️ אין מספיק ציוד זמין:\n\n' + conflicts.join('\n'))
    setSaving(true)

    const payload = {
      ...form,
      discount:       +form.discount,
      deposit_amount: +form.deposit_amount,
      delivery_price: +form.delivery_price,
      assembly_price: +form.assembly_price,
    }

    if (editId) {
      await supabase.from('rentals').update(payload).eq('id', editId)
      await supabase.from('rental_items').delete().eq('rental_id', editId)
      for (const l of lines.filter(l => l.equipment_id)) {
        const eq = equipment.find(e => e.id === l.equipment_id)
        await supabase.from('rental_items').insert({ rental_id:editId, equipment_id:l.equipment_id, quantity:+l.quantity, daily_rate:eq.daily_rate })
      }
    } else {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data:rental, error } = await supabase.from('rentals').insert({ ...payload, created_by:user.id }).select().single()
      if (error) { alert('שגיאה: ' + error.message); setSaving(false); return }
      for (const l of lines.filter(l => l.equipment_id)) {
        const eq = equipment.find(e => e.id === l.equipment_id)
        await supabase.from('rental_items').insert({ rental_id:rental.id, equipment_id:l.equipment_id, quantity:+l.quantity, daily_rate:eq.daily_rate })
      }
    }

    await load()
    setModal(false); setForm(EMPTY_FORM); setLines([{ equipment_id:'', quantity:1 }]); setAvailability({}); setEditId(null); setSaving(false)
  }

  const updateStatus = async (id, status) => {
    await supabase.from('rentals').update({ status }).eq('id', id)
    setRentals(p => p.map(r => r.id===id ? {...r,status} : r))
  }

  const shareWhatsApp = (r) => {
  const customer = r.customers?.full_name || 'לקוח'
  const days = Math.max(1, Math.ceil((new Date(r.end_date) - new Date(r.start_date)) / 86400000) + 1)
  const msg = `שלום ${customer} 👋

*אוורסט - השכרת ציוד אירועים*
————————————————
📅 *תאריכים:* ${r.start_date} עד ${r.end_date} (${days} ימים)
${r.pickup_type === 'delivery' ? `🚚 *משלוח לכתובת:* ${r.delivery_address || '—'}` : '📦 *איסוף עצמי*'}
${r.delivery_price > 0 ? `🚚 *עלות הובלה:* ₪${r.delivery_price}` : ''}
${r.assembly_price > 0 ? `🔨 *הרכבה ופירוק:* ₪${r.assembly_price}` : ''}
${r.discount > 0 ? `🎁 *הנחה:* ₪${r.discount}` : ''}
${r.notes ? `📝 *הערות:* ${r.notes}` : ''}
————————————————
תודה שבחרת באוורסט! 🏔️`

  const url = `https://wa.me/?text=${encodeURIComponent(msg)}`
  window.open(url, '_blank')
}

const del = async (id) => {
    if (!confirm('למחוק השכרה זו?')) return
    await supabase.from('rentals').delete().eq('id', id)
    setRentals(p => p.filter(r => r.id !== id))
  }

  const filtered = rentals.filter(r => filterStatus==='all' || r.status===filterStatus)

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
        .rent-row { transition: background 0.15s; }
        .rent-row:hover { background: #f8fafc !important; }
        .chip-btn { transition: all 0.15s; }
        .chip-btn:hover { background: #eef2ff !important; color: #6366f1 !important; }
        .icon-btn { transition: all 0.15s; opacity:0.5; }
        .icon-btn:hover { opacity:1; transform:scale(1.1); }
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px' }}>השכרות</h1>
          <p style={{ color:'#94a3b8', fontSize:13, marginTop:3 }}>{rentals.length} השכרות בסך הכל</p>
        </div>
        <button onClick={openNew}
          style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontWeight:700, padding:'10px 20px', borderRadius:12, cursor:'pointer', fontSize:14, boxShadow:'0 4px 12px rgba(99,102,241,0.25)', transition:'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
          + השכרה חדשה
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {['all', ...Object.keys(STATUS_LABEL)].map(st => (
          <button key={st} className="chip-btn" onClick={() => setFilter(st)}
            style={{ padding:'7px 16px', borderRadius:20, border:'1px solid', fontSize:13, cursor:'pointer',
              borderColor: filterStatus===st ? '#6366f1' : '#e2e8f0',
              background:  filterStatus===st ? '#eef2ff' : '#fff',
              color:       filterStatus===st ? '#6366f1' : '#64748b',
              fontWeight:  filterStatus===st ? 700 : 400 }}>
            {st==='all' ? 'הכל' : STATUS_LABEL[st]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden' }}>
        {filtered.length === 0
          ? <div style={{ padding:'60px 0', textAlign:'center', color:'#94a3b8' }}>
              <div style={{ fontSize:36, marginBottom:10 }}>📋</div>
              <div>אין השכרות</div>
            </div>
          : filtered.map((r, i) => (
            <div key={r.id} className="rent-row"
              style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 24px', borderBottom: i<filtered.length-1 ? '1px solid #f8fafc' : 'none', animation:`fadeUp 0.25s ease ${i*0.03}s both` }}>
              <div style={{ display:'flex', gap:14, alignItems:'center', flex:1 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:'#eef2ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                  {r.pickup_type === 'delivery' ? '🚚' : '📋'}
                </div>
                <div>
                  <div style={{ fontWeight:600, fontSize:14, color:'#1e293b' }}>{r.customers?.full_name || '—'}</div>
                  <div style={{ fontSize:12, color:'#94a3b8', marginTop:2, display:'flex', gap:8, flexWrap:'wrap' }}>
                    <span>{r.start_date} → {r.end_date}</span>
                    {r.delivery_price > 0 && <span style={{ color:'#6366f1', fontWeight:600 }}>🚚 ₪{r.delivery_price}</span>}
                    {r.assembly_price > 0 && <span style={{ color:'#10b981', fontWeight:600 }}>🔨 ₪{r.assembly_price}</span>}
                  </div>
                  {r.notes && <div style={{ fontSize:11, color:'#94a3b8' }}>{r.notes}</div>}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)}
                  style={{ background:STATUS_BG[r.status], color:STATUS_COLOR[r.status], border:`1px solid ${STATUS_COLOR[r.status]}33`, borderRadius:20, padding:'6px 14px', fontSize:12, fontWeight:600, cursor:'pointer', outline:'none' }}>
                  {Object.entries(STATUS_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button className="icon-btn" onClick={() => shareWhatsApp(r)}
  style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:16, padding:4 }}
  title="שתף ב-WhatsApp">📱</button>
                <button className="icon-btn" onClick={() => openEdit(r)}
                  style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:16, padding:4 }}>✏️</button>
                <button className="icon-btn" onClick={() => del(r.id)}
                  style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:16, padding:4 }}>🗑️</button>
              </div>
            </div>
          ))
        }
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'#fff', borderRadius:20, padding:32, width:500, maxHeight:'90vh', overflowY:'auto', direction:'rtl', boxShadow:'0 24px 60px rgba(0,0,0,0.15)', animation:'fadeUp 0.25s ease' }}>
            <h2 style={{ margin:'0 0 24px', fontSize:18, fontWeight:800, color:'#0f172a' }}>
              {editId ? '✏️ עריכת השכרה' : '📋 השכרה חדשה'}
            </h2>

            {/* Customer */}
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>לקוח *</label>
              <select style={inp} value={form.customer_id} onChange={e => setForm(p => ({...p,customer_id:e.target.value}))}>
                <option value="">-- בחר לקוח --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>

            {/* Dates */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              <div>
                <label style={lbl}>מתאריך *</label>
                <input style={inp} type="date" value={form.start_date} onChange={e => setForm(p => ({...p,start_date:e.target.value}))} />
              </div>
              <div>
                <label style={lbl}>עד תאריך *</label>
                <input style={inp} type="date" value={form.end_date} onChange={e => setForm(p => ({...p,end_date:e.target.value}))} />
              </div>
            </div>

            {availLoading && (
              <div style={{ background:'#f8fafc', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#94a3b8', marginBottom:14, display:'flex', gap:8, alignItems:'center' }}>
                <div style={{ width:14, height:14, border:'2px solid #e2e8f0', borderTop:'2px solid #6366f1', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                בודק זמינות ציוד...
              </div>
            )}

            {/* Pickup */}
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>אופן איסוף</label>
              <select style={inp} value={form.pickup_type} onChange={e => setForm(p => ({...p, pickup_type:e.target.value, delivery_price: e.target.value==='pickup' ? '0' : p.delivery_price}))}>
                <option value="pickup">איסוף עצמי</option>
                <option value="delivery">משלוח</option>
              </select>
            </div>

            {form.pickup_type === 'delivery' && (
              <div style={{ background:'#f8fafc', borderRadius:12, padding:14, marginBottom:14, border:'1px solid #e2e8f0' }}>
                <div style={{ marginBottom:10 }}>
                  <label style={lbl}>כתובת למשלוח</label>
                  <input style={inp} type="text" placeholder="רחוב, עיר" value={form.delivery_address}
                    onChange={e => setForm(p => ({...p,delivery_address:e.target.value}))} />
                </div>
                <div>
                  <label style={lbl}>🚚 מחיר הובלה (₪)</label>
                  <input style={{ ...inp, borderColor:'#6366f1' }} type="number" placeholder="0" value={form.delivery_price}
                    onChange={e => setForm(p => ({...p,delivery_price:e.target.value}))} />
                </div>
              </div>
            )}

            {/* הרכבה ופירוק */}
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>🔨 הרכבה ופירוק (₪)</label>
              <input style={inp} type="number" placeholder="0" value={form.assembly_price}
                onChange={e => setForm(p => ({...p,assembly_price:e.target.value}))}
                onFocus={e => e.target.style.borderColor='#6366f1'}
                onBlur={e => e.target.style.borderColor='#e2e8f0'} />
            </div>

            {/* Lines */}
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>פריטים</label>
              {lines.map((l,i) => {
                const avail = availability[l.equipment_id]
                const isOver = l.equipment_id && avail !== undefined && +l.quantity > avail
                return (
                  <div key={i} style={{ marginBottom:8 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <select style={{ ...inp, flex:2, borderColor: isOver ? '#ef4444' : '#e2e8f0' }}
                        value={l.equipment_id} onChange={e => updateLine(i,'equipment_id',e.target.value)}>
                        <option value="">-- בחר פריט --</option>
                        {equipment.map(e => {
                          const av = availability[e.id]
                          return <option key={e.id} value={e.id}>{e.name} (₪{e.daily_rate}/יום{av!==undefined ? ` | זמין: ${av}` : ''})</option>
                        })}
                      </select>
                      <input style={{ ...inp, width:70, flex:'none', borderColor: isOver ? '#ef4444' : '#e2e8f0' }}
                        type="number" min="1" value={l.quantity} onChange={e => updateLine(i,'quantity',e.target.value)} />
                      {lines.length>1 && (
                        <button onClick={() => removeLine(i)}
                          style={{ background:'#fef2f2', border:'none', color:'#ef4444', borderRadius:8, padding:'8px 10px', cursor:'pointer', fontSize:14, fontWeight:700 }}>✕</button>
                      )}
                    </div>
                    {isOver && (
                      <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'6px 12px', fontSize:12, color:'#ef4444', marginTop:4 }}>
                        ⚠️ ביקשת {l.quantity} יחידות — זמינות רק {avail}
                      </div>
                    )}
                    {!isOver && l.equipment_id && avail!==undefined && +l.quantity>0 && (
                      <div style={{ background:'#ecfdf5', border:'1px solid #bbf7d0', borderRadius:8, padding:'6px 12px', fontSize:12, color:'#10b981', marginTop:4 }}>
                        ✅ זמין — {avail} יחידות פנויות
                      </div>
                    )}
                  </div>
                )
              })}
              <button onClick={addLine}
                style={{ background:'#f8fafc', border:'1px dashed #cbd5e1', color:'#64748b', borderRadius:10, padding:'8px 16px', cursor:'pointer', fontSize:13, width:'100%', marginTop:4 }}>
                + הוסף פריט נוסף
              </button>
            </div>

            {/* Discount + Deposit */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              <div>
                <label style={lbl}>הנחה (₪)</label>
                <input style={inp} type="number" value={form.discount} onChange={e => setForm(p => ({...p,discount:e.target.value}))} />
              </div>
              <div>
                <label style={lbl}>מקדמה (₪)</label>
                <input style={inp} type="number" value={form.deposit_amount} onChange={e => setForm(p => ({...p,deposit_amount:e.target.value}))} />
              </div>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={lbl}>הערות</label>
              <input style={inp} type="text" value={form.notes} onChange={e => setForm(p => ({...p,notes:e.target.value}))} />
            </div>

            {/* Total */}
            <div style={{ background:'linear-gradient(135deg,#eef2ff,#f5f3ff)', borderRadius:12, padding:'14px 18px', marginBottom:20 }}>
              <div style={{ fontSize:12, color:'#94a3b8', marginBottom:8, textAlign:'center' }}>פירוט עלויות</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:10 }}>
                {form.pickup_type === 'delivery' && +form.delivery_price > 0 && (
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#475569' }}>
                    <span>🚚 הובלה</span>
                    <span>₪{(+form.delivery_price).toLocaleString()}</span>
                  </div>
                )}
                {+form.assembly_price > 0 && (
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#475569' }}>
                    <span>🔨 הרכבה ופירוק</span>
                    <span>₪{(+form.assembly_price).toLocaleString()}</span>
                  </div>
                )}
                {+form.discount > 0 && (
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#10b981' }}>
                    <span>🎁 הנחה</span>
                    <span>-₪{(+form.discount).toLocaleString()}</span>
                  </div>
                )}
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#f59e0b' }}>
                  <span>🧾 מע"מ 18%</span>
                  <span>₪{calcVAT().toFixed(2)}</span>
                </div>
              </div>
              <div style={{ textAlign:'center', borderTop:'1px solid #c7d2fe', paddingTop:10 }}>
                <div style={{ fontSize:12, color:'#94a3b8', marginBottom:4 }}>סה״כ לתשלום כולל מע"מ</div>
                <div style={{ fontSize:28, fontWeight:800, color:'#6366f1' }}>₪{calcTotal().toFixed(2)}</div>
              </div>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={save} disabled={saving}
                style={{ flex:1, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontWeight:700, padding:'13px', borderRadius:12, cursor:'pointer', fontSize:15 }}>
                {saving ? 'שומר...' : editId ? 'עדכן השכרה' : 'צור השכרה'}
              </button>
              <button onClick={() => { setModal(false); setEditId(null) }}
                style={{ flex:1, background:'#f8fafc', border:'1px solid #e2e8f0', color:'#64748b', fontWeight:600, padding:'13px', borderRadius:12, cursor:'pointer', fontSize:15 }}>
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
const inp = { width:'100%', background:'#f8fafc', border:'1px solid #e2e8f0', color:'#1e293b', borderRadius:10, padding:'10px 12px', fontSize:14, outline:'none', boxSizing:'border-box', transition:'border-color 0.2s' }