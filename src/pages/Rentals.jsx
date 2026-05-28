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
const EMPTY_FORM   = { customer_id:'', start_date:'', end_date:'', rental_days:1, pickup_type:'pickup', delivery_address:'', delivery_price:'0', assembly_price:'0', discount:'0', deposit_amount:'0', notes:'' }
const DAY_PRESETS  = [1, 2, 3, 7]

const inp = { width:'100%', background:'#111', border:`1px solid #333`, color:T.text, borderRadius:10, padding:'11px 14px', fontSize:14, outline:'none', boxSizing:'border-box', transition:'all 0.2s' }
const lbl = { display:'block', fontSize:11, fontWeight:700, color:T.muted, marginBottom:6, letterSpacing:1.5, textTransform:'uppercase' }

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
  const [equipSearch, setEquipSearch]   = useState('')

  const load = async () => {
    const [{ data:r }, { data:c }, { data:e }] = await Promise.all([
      supabase.from('rentals').select('*, customers(full_name)').order('created_at', { ascending:false }),
      supabase.from('customers').select('id, full_name').order('full_name'),
      supabase.from('equipment').select('id, name, daily_rate, quantity_total').eq('is_active', true).order('name'),
    ])
    setRentals(r||[]); setCustomers(c||[]); setEquipment(e||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!form.start_date || !form.end_date || !modal) return
    const check = async () => {
      setAvailLoading(true)
      const results = {}
      for (const eq of equipment) {
        const { data, error } = await supabase.rpc('get_available_quantity', { p_equipment_id:eq.id, p_start_date:form.start_date, p_end_date:form.end_date, p_exclude_rental_id:editId||null })
        results[eq.id] = error ? eq.quantity_total : data
      }
      setAvailability(results); setAvailLoading(false)
    }
    check()
  }, [form.start_date, form.end_date, modal])

  const openNew = () => { setEditId(null); setForm(EMPTY_FORM); setLines([{ equipment_id:'', quantity:1 }]); setAvailability({}); setEquipSearch(''); setModal(true) }

  const openEdit = async (r) => {
    setEditId(r.id)
    setForm({ customer_id:r.customer_id, start_date:r.start_date||'', end_date:r.end_date||'', rental_days:r.rental_days||1, pickup_type:r.pickup_type, delivery_address:r.delivery_address||'', delivery_price:String(r.delivery_price||0), assembly_price:String(r.assembly_price||0), discount:String(r.discount||0), deposit_amount:String(r.deposit_amount||0), notes:r.notes||'' })
    const { data: items } = await supabase.from('rental_items').select('equipment_id, quantity').eq('rental_id', r.id)
    setLines(items?.length ? items : [{ equipment_id:'', quantity:1 }])
    setAvailability({}); setEquipSearch(''); setModal(true)
  }

  const addLine    = () => setLines(p => [...p, { equipment_id:'', quantity:1 }])
  const removeLine = i  => setLines(p => p.filter((_,idx) => idx !== i))
  const updateLine = (i,k,v) => setLines(p => p.map((l,idx) => idx===i ? {...l,[k]:v} : l))

  const checkConflicts = () => lines.filter(l=>l.equipment_id).reduce((arr,l) => {
    const eq=equipment.find(e=>e.id===l.equipment_id); const av=availability[l.equipment_id]
    if (av!==undefined && +l.quantity>av) arr.push(`❌ ${eq.name}: ביקשת ${l.quantity}, זמין רק ${av}`)
    return arr
  }, [])

  const calcSubtotal = () => {
    const days = +form.rental_days||1
    return lines.reduce((s,l) => { const eq=equipment.find(e=>e.id===l.equipment_id); return s+(eq?eq.daily_rate*+l.quantity*days:0) }, 0) + +form.delivery_price + +form.assembly_price - +form.discount
  }
  const calcVAT   = () => calcSubtotal() * 0.18
  const calcTotal = () => calcSubtotal() * 1.18

  const save = async () => {
    if (!form.customer_id) return alert('נא לבחור לקוח')
    const conflicts = checkConflicts()
    if (conflicts.length) return alert('⚠️ אין מספיק ציוד:\n\n' + conflicts.join('\n'))
    setSaving(true)
    const payload = { ...form, rental_days:+form.rental_days||1, discount:+form.discount, deposit_amount:+form.deposit_amount, delivery_price:+form.delivery_price, assembly_price:+form.assembly_price }
    if (editId) {
      await supabase.from('rentals').update(payload).eq('id', editId)
      await supabase.from('rental_items').delete().eq('rental_id', editId)
      for (const l of lines.filter(l=>l.equipment_id)) { const eq=equipment.find(e=>e.id===l.equipment_id); await supabase.from('rental_items').insert({ rental_id:editId, equipment_id:l.equipment_id, quantity:+l.quantity, daily_rate:eq.daily_rate }) }
    } else {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data:rental, error } = await supabase.from('rentals').insert({ ...payload, created_by:user.id }).select().single()
      if (error) { alert('שגיאה: '+error.message); setSaving(false); return }
      for (const l of lines.filter(l=>l.equipment_id)) { const eq=equipment.find(e=>e.id===l.equipment_id); await supabase.from('rental_items').insert({ rental_id:rental.id, equipment_id:l.equipment_id, quantity:+l.quantity, daily_rate:eq.daily_rate }) }
    }
    await load(); setModal(false); setForm(EMPTY_FORM); setLines([{ equipment_id:'', quantity:1 }]); setAvailability({}); setEditId(null); setSaving(false)
  }

  const shareWhatsApp = (r) => {
    const msg = `שלום ${r.customers?.full_name||'לקוח'} 👋\n\n*אוורסט - השכרת ציוד*\n📅 ${r.start_date||'—'} עד ${r.end_date||'—'}\n🗓️ ${r.rental_days||1} ימים\n${r.pickup_type==='delivery'?`🚚 משלוח: ${r.delivery_address||'—'}`:'📦 איסוף עצמי'}\n${r.notes?`📝 ${r.notes}`:''}\n\nתודה! 🏔️`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const updateStatus = async (id, status) => {
    await supabase.from('rentals').update({ status }).eq('id', id)
    setRentals(p => p.map(r => r.id===id ? {...r,status} : r))
  }

  const del = async (id) => {
    if (!confirm('למחוק השכרה זו?')) return
    await supabase.from('rentals').delete().eq('id', id)
    setRentals(p => p.filter(r => r.id !== id))
  }

  const filtered      = rentals.filter(r => filterStatus==='all' || r.status===filterStatus)
  const filteredEquip = equipment.filter(e => e.name.includes(equipSearch))

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:80 }}>
      <div style={{ width:36, height:36, border:`3px solid ${T.border}`, borderTop:`3px solid ${T.red}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ direction:'rtl', color:T.text }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .rent-row{transition:background 0.15s;}
        .rent-row:hover{background:rgba(229,57,53,0.05)!important;}
        .chip{transition:all 0.15s;cursor:pointer;}
        .chip:hover{border-color:${T.red}!important;color:${T.red}!important;}
        .icon-btn{transition:all 0.15s;opacity:0.4;background:transparent;border:none;cursor:pointer;font-size:15px;padding:4px;}
        .icon-btn:hover{opacity:1;transform:scale(1.2);}
        .day-btn{transition:all 0.2s;cursor:pointer;border-radius:8px;padding:7px 14px;border:1px solid;font-size:13px;font-weight:700;}
        .day-btn:hover{transform:translateY(-1px);}
        .neo-input:focus{border-color:${T.red}!important;}
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
            <div style={{ width:4, height:28, background:`linear-gradient(${T.red},${T.redDark})`, borderRadius:4 }} />
            <h1 style={{ fontSize:26, fontWeight:900, color:T.text, letterSpacing:1 }}>השכרות</h1>
          </div>
          <p style={{ color:T.muted, fontSize:13, paddingRight:16 }}>{rentals.length} השכרות בסך הכל</p>
        </div>
        <button className="neo-btn" onClick={openNew} style={{ padding:'11px 22px', fontSize:14, borderRadius:12 }}>
          + השכרה חדשה
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {['all', ...Object.keys(STATUS_LABEL)].map(st => (
          <button key={st} className="chip"
            onClick={() => setFilter(st)}
            style={{ padding:'7px 16px', borderRadius:20, border:'1px solid', fontSize:12, fontWeight:600,
              borderColor: filterStatus===st ? T.red : T.border,
              background:  filterStatus===st ? T.redGlow : T.card,
              color:       filterStatus===st ? T.red : T.muted,
              boxShadow:   filterStatus===st ? `0 0 10px ${T.redGlow}` : T.neoOut }}>
            {st==='all'?'הכל':STATUS_LABEL[st]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:T.card, borderRadius:16, border:`1px solid ${T.border}`, boxShadow:T.neoOut, overflow:'hidden' }}>
        {filtered.length === 0
          ? <div style={{ padding:'60px 0', textAlign:'center', color:T.muted }}>
              <div style={{ fontSize:36, marginBottom:10, opacity:0.3 }}>📋</div>
              <div style={{ letterSpacing:1 }}>אין השכרות</div>
            </div>
          : filtered.map((r,i) => (
            <div key={r.id} className="rent-row"
              style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 22px', borderBottom: i<filtered.length-1 ? `1px solid ${T.border}` : 'none', animation:`fadeUp 0.25s ease ${i*0.03}s both` }}>
              <div style={{ display:'flex', gap:14, alignItems:'center', flex:1 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:T.surface, border:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                  {r.pickup_type==='delivery'?'🚚':'📋'}
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:T.text }}>{r.customers?.full_name||'—'}</div>
                  <div style={{ fontSize:11, color:T.muted, marginTop:3, display:'flex', gap:8, flexWrap:'wrap' }}>
                    {r.start_date && <span>{r.start_date} → {r.end_date}</span>}
                    <span style={{ color:T.red, fontWeight:700 }}>🗓️ {r.rental_days||1}י</span>
                    {r.delivery_price>0 && <span style={{ color:'#8b5cf6' }}>🚚 ₪{r.delivery_price}</span>}
                    {r.assembly_price>0 && <span style={{ color:'#10b981' }}>🔨 ₪{r.assembly_price}</span>}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)}
                  style={{ background:`${STATUS_COLOR[r.status]}18`, color:STATUS_COLOR[r.status], border:`1px solid ${STATUS_COLOR[r.status]}44`, borderRadius:20, padding:'5px 12px', fontSize:11, fontWeight:700, cursor:'pointer', outline:'none' }}>
                  {Object.entries(STATUS_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button className="icon-btn" onClick={() => shareWhatsApp(r)} title="WhatsApp">📱</button>
                <button className="icon-btn" onClick={() => openEdit(r)}>✏️</button>
                <button className="icon-btn" onClick={() => del(r.id)}>🗑️</button>
              </div>
            </div>
          ))
        }
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(8px)' }}>
          <div style={{ background:T.surface, borderRadius:20, padding:32, width:500, maxHeight:'90vh', overflowY:'auto', direction:'rtl', boxShadow:`0 24px 60px rgba(0,0,0,0.9), 0 0 40px ${T.redGlow}`, border:`1px solid ${T.border}`, animation:'fadeUp 0.25s ease' }}>

            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
              <div style={{ width:4, height:22, background:`linear-gradient(${T.red},${T.redDark})`, borderRadius:4 }} />
              <h2 style={{ margin:0, fontSize:17, fontWeight:900, color:T.text }}>{editId?'עריכת השכרה':'השכרה חדשה'}</h2>
            </div>

            {/* לקוח */}
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>לקוח *</label>
              <select style={{ ...inp, background:T.card, boxShadow:T.neo }} value={form.customer_id} onChange={e => setForm(p=>({...p,customer_id:e.target.value}))}>
                <option value="">-- בחר לקוח --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>

            {/* ימי השכרה */}
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>ימי השכרה (משפיע על המחיר)</label>
              <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                {DAY_PRESETS.map(d => (
                  <button key={d} className="day-btn" onClick={() => setForm(p=>({...p,rental_days:d}))}
                    style={{ borderColor: form.rental_days===d ? T.red : T.border, background: form.rental_days===d ? T.redGlow : T.card, color: form.rental_days===d ? T.red : T.muted, boxShadow: form.rental_days===d ? `0 0 10px ${T.redGlow}` : T.neoOut }}>
                    ×{d}
                  </button>
                ))}
                <input type="number" min="1" value={form.rental_days}
                  onChange={e => setForm(p=>({...p,rental_days:+e.target.value||1}))}
                  style={{ ...inp, width:80, textAlign:'center', fontWeight:800, color:T.red, background:T.card, boxShadow:T.neo }} />
                <span style={{ fontSize:12, color:T.muted }}>ימים</span>
              </div>
            </div>

            {/* תאריכים — זמינות בלבד */}
            <div style={{ background:T.card, borderRadius:12, padding:14, marginBottom:14, border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:10, color:T.muted, marginBottom:10, letterSpacing:1, textTransform:'uppercase' }}>📅 תאריכים — לבדיקת זמינות בלבד</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={lbl}>מתאריך</label>
                  <input style={{ ...inp, background:T.surface, boxShadow:T.neo }} type="date" value={form.start_date} onChange={e => setForm(p=>({...p,start_date:e.target.value}))} />
                </div>
                <div>
                  <label style={lbl}>עד תאריך</label>
                  <input style={{ ...inp, background:T.surface, boxShadow:T.neo }} type="date" value={form.end_date} onChange={e => setForm(p=>({...p,end_date:e.target.value}))} />
                </div>
              </div>
            </div>

            {availLoading && (
              <div style={{ background:T.card, borderRadius:10, padding:'10px 14px', fontSize:12, color:T.muted, marginBottom:14, display:'flex', gap:8, alignItems:'center', border:`1px solid ${T.border}` }}>
                <div style={{ width:12, height:12, border:`2px solid ${T.border}`, borderTop:`2px solid ${T.red}`, borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                בודק זמינות...
              </div>
            )}

            {/* Pickup */}
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>אופן איסוף</label>
              <select style={{ ...inp, background:T.card, boxShadow:T.neo }} value={form.pickup_type} onChange={e => setForm(p=>({...p,pickup_type:e.target.value,delivery_price:e.target.value==='pickup'?'0':p.delivery_price}))}>
                <option value="pickup">📦 איסוף עצמי</option>
                <option value="delivery">🚚 משלוח</option>
              </select>
            </div>

            {form.pickup_type==='delivery' && (
              <div style={{ background:T.card, borderRadius:12, padding:14, marginBottom:14, border:`1px solid ${T.border}` }}>
                <div style={{ marginBottom:10 }}>
                  <label style={lbl}>כתובת</label>
                  <input style={{ ...inp, background:T.surface, boxShadow:T.neo }} type="text" placeholder="רחוב, עיר" value={form.delivery_address} onChange={e => setForm(p=>({...p,delivery_address:e.target.value}))} />
                </div>
                <div>
                  <label style={lbl}>מחיר הובלה (₪)</label>
                  <input style={{ ...inp, background:T.surface, boxShadow:T.neo, borderColor:T.red }} type="number" placeholder="0" value={form.delivery_price} onChange={e => setForm(p=>({...p,delivery_price:e.target.value}))} />
                </div>
              </div>
            )}

            {/* הרכבה */}
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>🔨 הרכבה ופירוק (₪)</label>
              <input style={{ ...inp, background:T.card, boxShadow:T.neo }} type="number" placeholder="0" value={form.assembly_price} onChange={e => setForm(p=>({...p,assembly_price:e.target.value}))} onFocus={e=>e.target.style.borderColor=T.red} onBlur={e=>e.target.style.borderColor='#333'} />
            </div>

            {/* פריטים */}
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>פריטים</label>
              <div style={{ position:'relative', marginBottom:10 }}>
                <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:T.muted, fontSize:13 }}>🔍</span>
                <input className="neo-input" style={{ ...inp, paddingRight:32, fontSize:12, background:T.card, boxShadow:T.neo }} placeholder="חפש פריט..." value={equipSearch} onChange={e => setEquipSearch(e.target.value)} />
              </div>
              {lines.map((l,i) => {
                const avail = availability[l.equipment_id]
                const isOver = l.equipment_id && avail!==undefined && +l.quantity>avail
                return (
                  <div key={i} style={{ marginBottom:8 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <select style={{ ...inp, flex:2, background:T.card, boxShadow:T.neo, borderColor: isOver ? T.red : '#333' }} value={l.equipment_id} onChange={e => updateLine(i,'equipment_id',e.target.value)}>
                        <option value="">-- בחר פריט --</option>
                        {filteredEquip.map(e => { const av=availability[e.id]; return <option key={e.id} value={e.id}>{e.name} (₪{e.daily_rate}/י{av!==undefined?` | ✓${av}`:''} )</option> })}
                      </select>
                      <input style={{ ...inp, width:68, flex:'none', background:T.card, boxShadow:T.neo, borderColor: isOver ? T.red : '#333', textAlign:'center' }} type="number" min="1" value={l.quantity} onChange={e => updateLine(i,'quantity',e.target.value)} />
                      {lines.length>1 && <button onClick={() => removeLine(i)} style={{ background:T.redGlow, border:`1px solid ${T.red}44`, color:T.red, borderRadius:8, padding:'8px 10px', cursor:'pointer', fontSize:13, fontWeight:700 }}>✕</button>}
                    </div>
                    {isOver && <div style={{ background:T.redGlow, border:`1px solid ${T.red}44`, borderRadius:8, padding:'6px 12px', fontSize:11, color:T.red, marginTop:4 }}>⚠️ ביקשת {l.quantity} — זמין רק {avail}</div>}
                    {!isOver && l.equipment_id && avail!==undefined && +l.quantity>0 && <div style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:8, padding:'6px 12px', fontSize:11, color:'#10b981', marginTop:4 }}>✅ זמין — {avail} יחידות</div>}
                  </div>
                )
              })}
              <button onClick={addLine} style={{ background:'transparent', border:`1px dashed ${T.border}`, color:T.muted, borderRadius:10, padding:'8px 16px', cursor:'pointer', fontSize:12, width:'100%', marginTop:4, transition:'all 0.2s' }} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.red;e.currentTarget.style.color=T.red}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.muted}}>+ פריט נוסף</button>
            </div>

            {/* הנחה + מקדמה */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              <div>
                <label style={lbl}>הנחה (₪)</label>
                <input style={{ ...inp, background:T.card, boxShadow:T.neo }} type="number" value={form.discount} onChange={e => setForm(p=>({...p,discount:e.target.value}))} />
              </div>
              <div>
                <label style={lbl}>מקדמה (₪)</label>
                <input style={{ ...inp, background:T.card, boxShadow:T.neo }} type="number" value={form.deposit_amount} onChange={e => setForm(p=>({...p,deposit_amount:e.target.value}))} />
              </div>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={lbl}>הערות</label>
              <input style={{ ...inp, background:T.card, boxShadow:T.neo }} type="text" value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} onFocus={e=>e.target.style.borderColor=T.red} onBlur={e=>e.target.style.borderColor='#333'} />
            </div>

            {/* סיכום */}
            <div style={{ background:`linear-gradient(135deg,rgba(229,57,53,0.1),rgba(183,28,28,0.05))`, borderRadius:14, padding:'16px 20px', marginBottom:20, border:`1px solid rgba(229,57,53,0.2)` }}>
              <div style={{ fontSize:10, color:T.muted, marginBottom:10, textAlign:'center', letterSpacing:2, textTransform:'uppercase' }}>פירוט — {form.rental_days} יום</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
                {form.pickup_type==='delivery' && +form.delivery_price>0 && <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:T.muted }}><span>🚚 הובלה</span><span>₪{(+form.delivery_price).toLocaleString()}</span></div>}
                {+form.assembly_price>0 && <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:T.muted }}><span>🔨 הרכבה</span><span>₪{(+form.assembly_price).toLocaleString()}</span></div>}
                {+form.discount>0 && <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#10b981' }}><span>🎁 הנחה</span><span>-₪{(+form.discount).toLocaleString()}</span></div>}
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#f59e0b' }}><span>🧾 מע"מ 18%</span><span>₪{calcVAT().toFixed(2)}</span></div>
              </div>
              <div style={{ textAlign:'center', borderTop:`1px solid rgba(229,57,53,0.2)`, paddingTop:12 }}>
                <div style={{ fontSize:10, color:T.muted, marginBottom:4, letterSpacing:1 }}>סה״כ כולל מע"מ</div>
                <div style={{ fontSize:30, fontWeight:900, color:T.red, textShadow:`0 0 20px ${T.redGlow}` }}>₪{calcTotal().toFixed(2)}</div>
              </div>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button className="neo-btn" onClick={save} disabled={saving} style={{ flex:1, padding:'13px', fontSize:15, borderRadius:12 }}>
                {saving ? 'שומר...' : editId ? 'עדכן' : 'צור השכרה'}
              </button>
              <button onClick={() => { setModal(false); setEditId(null) }}
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