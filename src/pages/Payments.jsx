import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const METHOD_LABEL = { cash:'מזומן', transfer:'העברה בנקאית', credit:'אשראי', check:'צ\'ק' }
const METHOD_COLOR = { cash:'#10b981', transfer:'#6366f1', credit:'#f59e0b', check:'#8b5cf6' }
const METHOD_BG    = { cash:'#ecfdf5', transfer:'#eef2ff', credit:'#fffbeb', check:'#f5f3ff' }
const EMPTY = { rental_id:'', amount:'', method:'cash', reference:'', notes:'', is_deposit:false }

export default function Payments() {
  const [payments, setPayments]   = useState([])
  const [rentals, setRentals]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [filterMethod, setFilter] = useState('all')
  const [search, setSearch]       = useState('')

  const load = async () => {
    const [{ data: pays }, { data: rents }] = await Promise.all([
      supabase.from('payments').select('*, rentals(id, start_date, end_date, customers(full_name))').order('paid_at', { ascending:false }),
      supabase.from('rentals').select('id, start_date, end_date, customers(full_name)').not('status', 'eq', 'cancelled').order('start_date', { ascending:false }),
    ])
    setPayments(pays || [])
    setRentals(rents || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.rental_id || !form.amount) return alert('נא למלא הזמנה וסכום')
    setSaving(true)
    const { data:{ user } } = await supabase.auth.getUser()
    await supabase.from('payments').insert({
      rental_id:  form.rental_id,
      amount:     +form.amount,
      method:     form.method,
      reference:  form.reference,
      notes:      form.notes,
      is_deposit: form.is_deposit,
      paid_at:    new Date().toISOString(),
    })
    await load()
    setModal(false)
    setForm(EMPTY)
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm('למחוק תשלום זה?')) return
    await supabase.from('payments').delete().eq('id', id)
    setPayments(p => p.filter(p => p.id !== id))
  }

  const filtered = payments.filter(p => {
    const name = p.rentals?.customers?.full_name || ''
    return (filterMethod === 'all' || p.method === filterMethod) && name.includes(search)
  })

  const totalIncome = filtered.reduce((s, p) => s + +p.amount, 0)

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
        .pay-row { transition: background 0.15s; }
        .pay-row:hover { background: #f8fafc !important; }
        .chip-btn { transition: all 0.15s; }
        .chip-btn:hover { background: #eef2ff !important; color: #6366f1 !important; }
        .icon-btn { transition: all 0.15s; opacity:0.4; }
        .icon-btn:hover { opacity:1; }
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px' }}>תשלומים</h1>
          <p style={{ color:'#94a3b8', fontSize:13, marginTop:3 }}>{payments.length} תשלומים בסך הכל</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setModal(true) }}
          style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontWeight:700, padding:'10px 20px', borderRadius:12, cursor:'pointer', fontSize:14, boxShadow:'0 4px 12px rgba(99,102,241,0.25)', transition:'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
          + תשלום חדש
        </button>
      </div>

      {/* סיכום */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'סה״כ הכנסות', value:`₪${totalIncome.toLocaleString()}`, icon:'💰', color:'#10b981', bg:'#ecfdf5' },
          { label:'מזומן',       value:`₪${filtered.filter(p=>p.method==='cash').reduce((s,p)=>s+ +p.amount,0).toLocaleString()}`,     icon:'💵', color:'#10b981', bg:'#ecfdf5' },
          { label:'העברה',       value:`₪${filtered.filter(p=>p.method==='transfer').reduce((s,p)=>s+ +p.amount,0).toLocaleString()}`, icon:'🏦', color:'#6366f1', bg:'#eef2ff' },
          { label:'אשראי',       value:`₪${filtered.filter(p=>p.method==='credit').reduce((s,p)=>s+ +p.amount,0).toLocaleString()}`,   icon:'💳', color:'#f59e0b', bg:'#fffbeb' },
        ].map((s,i) => (
          <div key={i} style={{ background:s.bg, borderRadius:14, padding:'16px 20px', border:`1px solid ${s.color}33` }}>
            <div style={{ fontSize:22, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש לפי לקוח..."
            style={{ background:'#fff', border:'1px solid #e2e8f0', color:'#1e293b', borderRadius:10, padding:'9px 36px 9px 14px', fontSize:13, outline:'none', width:200 }} />
        </div>
        {['all', ...Object.keys(METHOD_LABEL)].map(m => (
          <button key={m} className="chip-btn" onClick={() => setFilter(m)}
            style={{ padding:'7px 16px', borderRadius:20, border:'1px solid', fontSize:13, cursor:'pointer',
              borderColor: filterMethod===m ? '#6366f1' : '#e2e8f0',
              background:  filterMethod===m ? '#eef2ff' : '#fff',
              color:       filterMethod===m ? '#6366f1' : '#64748b',
              fontWeight:  filterMethod===m ? 700 : 400 }}>
            {m==='all' ? 'הכל' : METHOD_LABEL[m]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden' }}>
        {filtered.length === 0
          ? <div style={{ padding:'60px 0', textAlign:'center', color:'#94a3b8' }}>
              <div style={{ fontSize:36, marginBottom:10 }}>💳</div>
              <div>אין תשלומים</div>
            </div>
          : filtered.map((p, i) => (
            <div key={p.id} className="pay-row"
              style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 24px', borderBottom: i<filtered.length-1 ? '1px solid #f8fafc' : 'none', animation:`fadeUp 0.25s ease ${i*0.03}s both` }}>
              <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                <div style={{ width:40, height:40, borderRadius:12, background:METHOD_BG[p.method], display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                  {p.method==='cash'?'💵':p.method==='transfer'?'🏦':p.method==='credit'?'💳':'📝'}
                </div>
                <div>
                  <div style={{ fontWeight:600, fontSize:14, color:'#1e293b' }}>
                    {p.rentals?.customers?.full_name || '—'}
                    {p.is_deposit && <span style={{ marginRight:8, fontSize:11, background:'#fef3c7', color:'#d97706', padding:'2px 8px', borderRadius:20, fontWeight:600 }}>מקדמה</span>}
                  </div>
                  <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>
                    {new Date(p.paid_at).toLocaleDateString('he-IL')}
                    {p.reference && ` · אסמכתה: ${p.reference}`}
                  </div>
                  {p.notes && <div style={{ fontSize:11, color:'#94a3b8' }}>{p.notes}</div>}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ background:METHOD_BG[p.method], color:METHOD_COLOR[p.method], padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600, border:`1px solid ${METHOD_COLOR[p.method]}33` }}>
                  {METHOD_LABEL[p.method]}
                </span>
                <span style={{ fontWeight:800, fontSize:16, color:'#10b981' }}>₪{(+p.amount).toLocaleString()}</span>
                <button className="icon-btn" onClick={() => del(p.id)}
                  style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:15 }}>🗑️</button>
              </div>
            </div>
          ))
        }
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'#fff', borderRadius:20, padding:32, width:420, direction:'rtl', boxShadow:'0 24px 60px rgba(0,0,0,0.15)', animation:'fadeUp 0.25s ease' }}>
            <h2 style={{ margin:'0 0 24px', fontSize:18, fontWeight:800, color:'#0f172a' }}>💳 תשלום חדש</h2>

            <div style={{ marginBottom:14 }}>
              <label style={lbl}>הזמנה *</label>
              <select style={inp} value={form.rental_id} onChange={e => setForm(p => ({...p,rental_id:e.target.value}))}>
                <option value="">-- בחר הזמנה --</option>
                {rentals.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.customers?.full_name} — {r.start_date} עד {r.end_date}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              <div>
                <label style={lbl}>סכום (₪) *</label>
                <input style={inp} type="number" placeholder="0" value={form.amount}
                  onChange={e => setForm(p => ({...p,amount:e.target.value}))}
                  onFocus={e => e.target.style.borderColor='#6366f1'}
                  onBlur={e => e.target.style.borderColor='#e2e8f0'} />
              </div>
              <div>
                <label style={lbl}>אמצעי תשלום</label>
                <select style={inp} value={form.method} onChange={e => setForm(p => ({...p,method:e.target.value}))}>
                  {Object.entries(METHOD_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={lbl}>אסמכתה / מספר קבלה</label>
              <input style={inp} type="text" placeholder="לדוגמה: 12345" value={form.reference}
                onChange={e => setForm(p => ({...p,reference:e.target.value}))}
                onFocus={e => e.target.style.borderColor='#6366f1'}
                onBlur={e => e.target.style.borderColor='#e2e8f0'} />
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={lbl}>הערות</label>
              <input style={inp} type="text" placeholder="הערות נוספות..." value={form.notes}
                onChange={e => setForm(p => ({...p,notes:e.target.value}))}
                onFocus={e => e.target.style.borderColor='#6366f1'}
                onBlur={e => e.target.style.borderColor='#e2e8f0'} />
            </div>

            <div style={{ marginBottom:20, display:'flex', alignItems:'center', gap:10, background:'#fffbeb', borderRadius:10, padding:'10px 14px' }}>
              <input type="checkbox" id="isDeposit" checked={form.is_deposit}
                onChange={e => setForm(p => ({...p,is_deposit:e.target.checked}))}
                style={{ width:16, height:16, cursor:'pointer' }} />
              <label htmlFor="isDeposit" style={{ fontSize:14, color:'#92400e', cursor:'pointer', fontWeight:600 }}>
                🏦 זהו תשלום מקדמה
              </label>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={save} disabled={saving}
                style={{ flex:1, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontWeight:700, padding:'13px', borderRadius:12, cursor:'pointer', fontSize:15 }}>
                {saving ? 'שומר...' : 'שמור תשלום'}
              </button>
              <button onClick={() => setModal(false)}
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