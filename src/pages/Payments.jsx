import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const T = {
  bg:'#0d0d0d', surface:'#161616', card:'#1a1a1a', border:'#2a2a2a',
  red:'#e53935', redDark:'#b71c1c', redGlow:'rgba(229,57,53,0.18)',
  text:'#f0f0f0', muted:'#888',
  neo:'inset 2px 2px 5px rgba(0,0,0,0.6), inset -2px -2px 5px rgba(255,255,255,0.04)',
  neoOut:'4px 4px 10px rgba(0,0,0,0.6), -2px -2px 6px rgba(255,255,255,0.03)',
}

const METHOD_LABEL = { cash:'מזומן', transfer:'העברה', credit:'אשראי', check:'צ\'ק' }
const METHOD_COLOR = { cash:'#10b981', transfer:'#6366f1', credit:'#f59e0b', check:'#8b5cf6' }
const EMPTY = { rental_id:'', amount:'', method:'cash', reference:'', notes:'', is_deposit:false }

const inp = { width:'100%', background:'#111', border:`1px solid #333`, color:T.text, borderRadius:10, padding:'11px 14px', fontSize:14, outline:'none', boxSizing:'border-box', transition:'all 0.2s' }
const lbl = { display:'block', fontSize:11, fontWeight:700, color:T.muted, marginBottom:6, letterSpacing:1.5, textTransform:'uppercase' }

export default function Payments() {
  const [payments, setPayments]   = useState([])
  const [rentals, setRentals]     = useState([])
  const [summaries, setSummaries] = useState({})
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [filterMethod, setFilter] = useState('all')
  const [search, setSearch]       = useState('')
  const [activeTab, setActiveTab] = useState('payments')

  const load = async () => {
    const [{ data:pays }, { data:rents }, { data:sums }] = await Promise.all([
      supabase.from('payments').select('*, rentals(id, start_date, end_date, customers(full_name))').order('paid_at',{ascending:false}),
      supabase.from('rentals').select('id, start_date, end_date, customers(full_name)').not('status','eq','cancelled').order('start_date',{ascending:false}),
      supabase.from('rental_payment_summary').select('*'),
    ])
    setPayments(pays||[]); setRentals(rents||[])
    const map={}; (sums||[]).forEach(s=>{ map[s.rental_id]=s }); setSummaries(map)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.rental_id||!form.amount) return alert('נא למלא הזמנה וסכום')
    setSaving(true)
    await supabase.from('payments').insert({ rental_id:form.rental_id, amount:+form.amount, method:form.method, reference:form.reference, notes:form.notes, is_deposit:form.is_deposit, paid_at:new Date().toISOString() })
    await load(); setModal(false); setForm(EMPTY); setSaving(false)
  }

  const del = async (id) => {
    if (!confirm('למחוק?')) return
    await supabase.from('payments').delete().eq('id',id)
    setPayments(p=>p.filter(x=>x.id!==id)); await load()
  }

  const filtered = payments.filter(p => {
    const name=p.rentals?.customers?.full_name||''
    return (filterMethod==='all'||p.method===filterMethod) && name.includes(search)
  })

  const totalIncome  = filtered.reduce((s,p)=>s+ +p.amount,0)
  const rentalsWithBalance = rentals.map(r=>({...r,summary:summaries[r.id]||{total_amount:0,paid:0,remaining:0}})).filter(r=>r.summary.total_amount>0)
  const totalDebt    = rentalsWithBalance.reduce((s,r)=>s+Math.max(0,+r.summary.remaining),0)

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
        .pay-row{transition:background 0.15s;}
        .pay-row:hover{background:rgba(229,57,53,0.05)!important;}
        .chip{transition:all 0.15s;cursor:pointer;}
        .chip:hover{border-color:${T.red}!important;color:${T.red}!important;}
        .icon-btn{transition:all 0.15s;opacity:0.4;background:transparent;border:none;cursor:pointer;font-size:15px;padding:4px;}
        .icon-btn:hover{opacity:1;}
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
            <div style={{ width:4, height:28, background:`linear-gradient(${T.red},${T.redDark})`, borderRadius:4 }} />
            <h1 style={{ fontSize:26, fontWeight:900, color:T.text, letterSpacing:1 }}>תשלומים</h1>
          </div>
          <p style={{ color:T.muted, fontSize:13, paddingRight:16 }}>{payments.length} תשלומים</p>
        </div>
        <button className="neo-btn" onClick={() => { setForm(EMPTY); setModal(true) }}
          style={{ padding:'11px 22px', fontSize:14, borderRadius:12 }}>
          + תשלום חדש
        </button>
      </div>

      {/* KPI */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {[
          { label:'סה״כ התקבל', value:`₪${totalIncome.toLocaleString()}`,  icon:'💰', color:'#10b981', border:'rgba(16,185,129,0.2)' },
          { label:'חוב פתוח',   value:`₪${totalDebt.toLocaleString()}`,     icon:'⏳', color:T.red,    border:'rgba(229,57,53,0.2)' },
          { label:'מזומן',      value:`₪${filtered.filter(p=>p.method==='cash').reduce((s,p)=>s+ +p.amount,0).toLocaleString()}`,     icon:'💵', color:'#10b981', border:'rgba(16,185,129,0.15)' },
          { label:'העברה',      value:`₪${filtered.filter(p=>p.method==='transfer').reduce((s,p)=>s+ +p.amount,0).toLocaleString()}`, icon:'🏦', color:'#6366f1', border:'rgba(99,102,241,0.2)' },
        ].map((s,i) => (
          <div key={i} style={{ background:T.card, borderRadius:14, padding:'16px 18px', border:`1px solid ${s.border}`, boxShadow:T.neoOut, animation:`fadeUp 0.3s ease ${i*0.07}s both` }}>
            <div style={{ fontSize:22, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontSize:18, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:T.muted, marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[{ key:'payments', label:'💳 היסטוריה' }, { key:'summary', label:'📊 שולם / יתרה' }].map(t => (
          <button key={t.key} className="chip" onClick={() => setActiveTab(t.key)}
            style={{ padding:'9px 18px', borderRadius:12, border:'1px solid', fontSize:13, fontWeight:600,
              borderColor: activeTab===t.key ? T.red : T.border,
              background:  activeTab===t.key ? T.redGlow : T.card,
              color:       activeTab===t.key ? T.red : T.muted,
              boxShadow:   activeTab===t.key ? `0 0 10px ${T.redGlow}` : T.neoOut }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab==='payments' && <>
        {/* Filters */}
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:T.muted }}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="חיפוש לקוח..."
              style={{ ...inp, paddingRight:36, width:180, background:T.card, boxShadow:T.neo }} />
          </div>
          {['all',...Object.keys(METHOD_LABEL)].map(m => (
            <button key={m} className="chip" onClick={() => setFilter(m)}
              style={{ padding:'7px 14px', borderRadius:20, border:'1px solid', fontSize:11, fontWeight:600,
                borderColor: filterMethod===m ? T.red : T.border,
                background:  filterMethod===m ? T.redGlow : T.card,
                color:       filterMethod===m ? T.red : T.muted }}>
              {m==='all'?'הכל':METHOD_LABEL[m]}
            </button>
          ))}
        </div>

        <div style={{ background:T.card, borderRadius:16, border:`1px solid ${T.border}`, boxShadow:T.neoOut, overflow:'hidden' }}>
          {filtered.length===0
            ? <div style={{ padding:'60px 0', textAlign:'center', color:T.muted }}><div style={{ fontSize:36, opacity:0.3, marginBottom:10 }}>💳</div><div style={{ letterSpacing:1 }}>אין תשלומים</div></div>
            : filtered.map((p,i) => (
              <div key={p.id} className="pay-row"
                style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px 22px', borderBottom:i<filtered.length-1?`1px solid ${T.border}`:'none', animation:`fadeUp 0.25s ease ${i*0.03}s both` }}>
                <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:`${METHOD_COLOR[p.method]}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, border:`1px solid ${METHOD_COLOR[p.method]}33` }}>
                    {p.method==='cash'?'💵':p.method==='transfer'?'🏦':p.method==='credit'?'💳':'📝'}
                  </div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13, color:T.text }}>
                      {p.rentals?.customers?.full_name||'—'}
                      {p.is_deposit && <span style={{ marginRight:8, fontSize:10, background:'rgba(245,158,11,0.15)', color:'#f59e0b', padding:'2px 8px', borderRadius:20, fontWeight:700 }}>מקדמה</span>}
                    </div>
                    <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>
                      {new Date(p.paid_at).toLocaleDateString('he-IL')}
                      {p.reference && ` · ${p.reference}`}
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ background:`${METHOD_COLOR[p.method]}18`, color:METHOD_COLOR[p.method], padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700, border:`1px solid ${METHOD_COLOR[p.method]}33` }}>
                    {METHOD_LABEL[p.method]}
                  </span>
                  <span style={{ fontWeight:800, fontSize:15, color:'#10b981' }}>₪{(+p.amount).toLocaleString()}</span>
                  <button className="icon-btn" onClick={() => del(p.id)}>🗑️</button>
                </div>
              </div>
            ))
          }
        </div>
      </>}

      {activeTab==='summary' && (
        <div style={{ background:T.card, borderRadius:16, border:`1px solid ${T.border}`, boxShadow:T.neoOut, overflow:'hidden' }}>
          <div style={{ padding:'14px 22px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontWeight:700, fontSize:13, color:T.text }}>📊 מצב תשלומים לפי הזמנה</span>
            <span style={{ fontSize:11, color:T.muted }}>{rentalsWithBalance.length} הזמנות</span>
          </div>
          {rentalsWithBalance.length===0
            ? <div style={{ padding:'60px 0', textAlign:'center', color:T.muted, fontSize:12 }}>אין נתונים</div>
            : rentalsWithBalance.map((r,i) => {
              const s=r.summary, total=+s.total_amount||0, paid=+s.paid||0, remaining=+s.remaining||0
              const pct=total>0?Math.min(100,(paid/total)*100):0, isFullyPaid=remaining<=0
              return (
                <div key={r.id} className="pay-row"
                  style={{ padding:'16px 22px', borderBottom:i<rentalsWithBalance.length-1?`1px solid ${T.border}`:'none', animation:`fadeUp 0.25s ease ${i*0.04}s both` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:13, color:T.text }}>{r.customers?.full_name||'—'}</div>
                      <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{r.start_date} → {r.end_date}</div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20,
                        background: isFullyPaid ? 'rgba(16,185,129,0.12)' : T.redGlow,
                        color:      isFullyPaid ? '#10b981' : T.red,
                        border:`1px solid ${isFullyPaid?'rgba(16,185,129,0.2)':'rgba(229,57,53,0.2)'}` }}>
                        {isFullyPaid ? '✅ שולם' : `⏳ ₪${remaining.toLocaleString()}`}
                      </span>
                      {!isFullyPaid && (
                        <button className="neo-btn" onClick={() => { setForm({...EMPTY,rental_id:r.id,amount:String(remaining)}); setModal(true) }}
                          style={{ fontSize:11, padding:'4px 10px', borderRadius:8 }}>
                          + רשום
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                    <div style={{ flex:1, height:5, background:T.border, borderRadius:10 }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:isFullyPaid?'#10b981':`linear-gradient(90deg,${T.red},${T.redDark})`, borderRadius:10, transition:'width 0.6s', boxShadow:`0 0 8px ${isFullyPaid?'rgba(16,185,129,0.4)':T.redGlow}` }} />
                    </div>
                    <div style={{ fontSize:11, color:T.muted, flexShrink:0 }}>
                      <span style={{ color:'#10b981', fontWeight:700 }}>₪{paid.toLocaleString()}</span>
                      <span> / ₪{total.toLocaleString()}</span>
                      <span style={{ color:T.red }}> ({Math.round(pct)}%)</span>
                    </div>
                  </div>
                </div>
              )
            })
          }
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(8px)' }}>
          <div style={{ background:T.surface, borderRadius:20, padding:32, width:420, direction:'rtl', boxShadow:`0 24px 60px rgba(0,0,0,0.9),0 0 40px ${T.redGlow}`, border:`1px solid ${T.border}`, animation:'fadeUp 0.25s ease' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
              <div style={{ width:4, height:22, background:`linear-gradient(${T.red},${T.redDark})`, borderRadius:4 }} />
              <h2 style={{ margin:0, fontSize:17, fontWeight:900, color:T.text }}>💳 תשלום חדש</h2>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={lbl}>הזמנה *</label>
              <select style={{ ...inp, background:T.card, boxShadow:T.neo }} value={form.rental_id} onChange={e=>setForm(p=>({...p,rental_id:e.target.value}))}>
                <option value="">-- בחר הזמנה --</option>
                {rentals.map(r => <option key={r.id} value={r.id}>{r.customers?.full_name} — {r.start_date}{summaries[r.id]?` | יתרה: ₪${Math.max(0,+summaries[r.id].remaining).toLocaleString()}`:''}</option>)}
              </select>
            </div>

            {form.rental_id && summaries[form.rental_id] && (
              <div style={{ background:T.card, borderRadius:10, padding:'10px 14px', marginBottom:14, display:'flex', justifyContent:'space-between', border:`1px solid ${T.border}` }}>
                <span style={{ fontSize:12, color:T.muted }}>שולם: <strong style={{ color:'#10b981' }}>₪{(+summaries[form.rental_id].paid).toLocaleString()}</strong></span>
                <span style={{ fontSize:12, color:T.muted }}>יתרה: <strong style={{ color:+summaries[form.rental_id].remaining>0?T.red:'#10b981' }}>₪{Math.max(0,+summaries[form.rental_id].remaining).toLocaleString()}</strong></span>
                <span style={{ fontSize:12, color:T.muted }}>סה״כ: <strong style={{ color:T.text }}>₪{(+summaries[form.rental_id].total_amount).toLocaleString()}</strong></span>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              <div>
                <label style={lbl}>סכום (₪) *</label>
                <input style={{ ...inp, background:T.card, boxShadow:T.neo }} type="number" placeholder="0" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} onFocus={e=>e.target.style.borderColor=T.red} onBlur={e=>e.target.style.borderColor='#333'} />
              </div>
              <div>
                <label style={lbl}>אמצעי תשלום</label>
                <select style={{ ...inp, background:T.card, boxShadow:T.neo }} value={form.method} onChange={e=>setForm(p=>({...p,method:e.target.value}))}>
                  {Object.entries(METHOD_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={lbl}>אסמכתה</label>
              <input style={{ ...inp, background:T.card, boxShadow:T.neo }} type="text" placeholder="מספר קבלה..." value={form.reference} onChange={e=>setForm(p=>({...p,reference:e.target.value}))} onFocus={e=>e.target.style.borderColor=T.red} onBlur={e=>e.target.style.borderColor='#333'} />
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={lbl}>הערות</label>
              <input style={{ ...inp, background:T.card, boxShadow:T.neo }} type="text" placeholder="הערות..." value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} onFocus={e=>e.target.style.borderColor=T.red} onBlur={e=>e.target.style.borderColor='#333'} />
            </div>

            <div style={{ marginBottom:20, display:'flex', alignItems:'center', gap:10, background:'rgba(245,158,11,0.08)', borderRadius:10, padding:'10px 14px', border:'1px solid rgba(245,158,11,0.2)' }}>
              <input type="checkbox" id="dep" checked={form.is_deposit} onChange={e=>setForm(p=>({...p,is_deposit:e.target.checked}))} style={{ width:16, height:16, cursor:'pointer', accentColor:T.red }} />
              <label htmlFor="dep" style={{ fontSize:13, color:'#f59e0b', cursor:'pointer', fontWeight:700 }}>🏦 מקדמה</label>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button className="neo-btn" onClick={save} disabled={saving} style={{ flex:1, padding:'13px', fontSize:15, borderRadius:12 }}>
                {saving?'שומר...':'שמור תשלום'}
              </button>
              <button onClick={()=>setModal(false)}
                style={{ flex:1, background:T.card, border:`1px solid ${T.border}`, color:T.muted, fontWeight:600, padding:'13px', borderRadius:12, cursor:'pointer', fontSize:15, boxShadow:T.neoOut, transition:'all 0.2s' }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=T.red} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}