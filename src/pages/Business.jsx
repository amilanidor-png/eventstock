import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const EXP_CAT = {
  rent:      { label:'שכירות',        icon:'🏠', color:'#6366f1' },
  vehicle:   { label:'רכב',           icon:'🚗', color:'#f59e0b' },
  equipment: { label:'ציוד',          icon:'🔧', color:'#10b981' },
  salary:    { label:'שכירות עובדים', icon:'👷', color:'#8b5cf6' },
  marketing: { label:'שיווק',         icon:'📣', color:'#ec4899' },
  utilities: { label:'חשמל/מים',      icon:'💡', color:'#14b8a6' },
  other:     { label:'אחר',           icon:'📦', color:'#94a3b8' },
}

const PERIODS = [
  { key:'day',   label:'היום' },
  { key:'week',  label:'שבוע' },
  { key:'month', label:'חודש' },
  { key:'year',  label:'שנה' },
  { key:'all',   label:'מאז הקמה' },
]

const EMPTY_EXP = { amount:'', category:'other', description:'', paid_at: new Date().toISOString().slice(0,10), notes:'' }

function getPeriodRange(period) {
  const now = new Date()
  const pad = n => String(n).padStart(2,'0')
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
  const today = fmt(now)
  if (period === 'day')   return { from: today, to: today }
  if (period === 'week')  { const d = new Date(now); d.setDate(d.getDate()-6);  return { from: fmt(d), to: today } }
  if (period === 'month') { const d = new Date(now); d.setDate(d.getDate()-29); return { from: fmt(d), to: today } }
  if (period === 'year')  { const d = new Date(now); d.setFullYear(d.getFullYear()-1); return { from: fmt(d), to: today } }
  return { from: '2000-01-01', to: today }
}

// ייצוא CSV (נפתח באקסל)
function exportToCSV({ payments, expenses, income, totalExpenses, balance, periodLabel }) {
  const BOM = '\uFEFF' // תמיכה בעברית באקסל
  const rows = []

  rows.push(['דוח מצב עסק — אוורסט השכרת ציוד'])
  rows.push([`תקופה: ${periodLabel}`])
  rows.push([`תאריך הפקה: ${new Date().toLocaleDateString('he-IL')}`])
  rows.push([])

  rows.push(['סיכום'])
  rows.push(['הכנסות', `₪${income.toLocaleString()}`])
  rows.push(['הוצאות', `₪${totalExpenses.toLocaleString()}`])
  rows.push(['יתרה', `₪${balance.toLocaleString()}`])
  rows.push([])

  rows.push(['הכנסות מתשלומים'])
  rows.push(['תאריך', 'סכום', 'אסמכתה', 'הערות'])
  payments.forEach(p => rows.push([p.paid_at, p.amount, p.reference || '', p.notes || '']))
  rows.push([])

  rows.push(['הוצאות'])
  rows.push(['תאריך', 'תיאור', 'קטגוריה', 'סכום', 'הערות'])
  expenses.forEach(e => rows.push([e.paid_at, e.description, EXP_CAT[e.category]?.label || e.category, e.amount, e.notes || '']))

  const csv = BOM + rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `אוורסט-דוח-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Business() {
  const [period, setPeriod]         = useState('month')
  const [income, setIncome]         = useState(0)
  const [payments, setPayments]     = useState([])
  const [expenses, setExpenses]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [exporting, setExporting]   = useState(false)
  const [modal, setModal]           = useState(false)
  const [form, setForm]             = useState(EMPTY_EXP)
  const [saving, setSaving]         = useState(false)

  const load = async () => {
    setLoading(true)
    const { from, to } = getPeriodRange(period)

    const [{ data: pays }, { data: exps }] = await Promise.all([
      supabase.from('payments').select('*').gte('paid_at', from).lte('paid_at', to).order('paid_at', { ascending:false }),
      supabase.from('expenses').select('*').gte('paid_at', from).lte('paid_at', to).order('paid_at', { ascending:false }),
    ])

    const paysData = pays || []
    setPayments(paysData)
    setIncome(paysData.reduce((s, p) => s + +p.amount, 0))
    setExpenses(exps || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [period])

  const totalExpenses = expenses.reduce((s, e) => s + +e.amount, 0)
  const balance       = income - totalExpenses

  const byCategory = Object.entries(EXP_CAT).map(([key, meta]) => ({
    key, ...meta,
    total: expenses.filter(e => e.category === key).reduce((s, e) => s + +e.amount, 0)
  })).filter(c => c.total > 0).sort((a,b) => b.total - a.total)

  const handleExport = () => {
    setExporting(true)
    const periodLabel = PERIODS.find(p => p.key === period)?.label || period
    exportToCSV({ payments, expenses, income, totalExpenses, balance, periodLabel })
    setTimeout(() => setExporting(false), 1000)
  }

  const save = async () => {
    if (!form.amount || !form.description) return alert('נא למלא סכום ותיאור')
    setSaving(true)
    const { data:{ user } } = await supabase.auth.getUser()
    await supabase.from('expenses').insert({ ...form, amount: +form.amount, created_by: user.id })
    await load()
    setModal(false)
    setForm(EMPTY_EXP)
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm('למחוק הוצאה זו?')) return
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(p => p.filter(e => e.id !== id))
  }

  return (
    <div style={{ direction:'rtl' }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        .chip-btn { transition: all 0.15s; }
        .chip-btn:hover { background: #eef2ff !important; color: #6366f1 !important; }
        .exp-row { transition: background 0.15s; }
        .exp-row:hover { background: #f8fafc !important; }
        .icon-btn { transition: all 0.15s; opacity:0.4; }
        .icon-btn:hover { opacity:1; }
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px' }}>מצב העסק</h1>
          <p style={{ color:'#94a3b8', fontSize:13, marginTop:3 }}>סקירה פיננסית</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          {/* ייצוא לאקסל */}
          <button onClick={handleExport} disabled={exporting}
            style={{ background:'#fff', border:'1px solid #e2e8f0', color:'#475569', fontWeight:600, padding:'10px 16px', borderRadius:12, cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:6, transition:'all 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor='#6366f1'}
            onMouseLeave={e => e.currentTarget.style.borderColor='#e2e8f0'}>
            {exporting ? '⏳' : '📊'} {exporting ? 'מייצא...' : 'ייצוא לאקסל'}
          </button>
          <button onClick={() => { setForm(EMPTY_EXP); setModal(true) }}
            style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontWeight:700, padding:'10px 20px', borderRadius:12, cursor:'pointer', fontSize:14, boxShadow:'0 4px 12px rgba(99,102,241,0.25)', transition:'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
            + הוצאה חדשה
          </button>
        </div>
      </div>

      {/* Period filter */}
      <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' }}>
        {PERIODS.map(p => (
          <button key={p.key} className="chip-btn" onClick={() => setPeriod(p.key)}
            style={{ padding:'8px 18px', borderRadius:20, border:'1px solid', fontSize:13, cursor:'pointer',
              borderColor: period===p.key ? '#6366f1' : '#e2e8f0',
              background:  period===p.key ? '#eef2ff' : '#fff',
              color:       period===p.key ? '#6366f1' : '#64748b',
              fontWeight:  period===p.key ? 700 : 400 }}>
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
          <div style={{ width:32, height:32, border:'3px solid #e2e8f0', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <>
          {/* KPI */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:28 }}>
            {[
              { label:'הכנסות',  value:income,        icon:'💰', color:'#10b981', bg:'#ecfdf5', border:'#bbf7d0' },
              { label:'הוצאות',  value:totalExpenses, icon:'💸', color:'#ef4444', bg:'#fef2f2', border:'#fecaca' },
              { label:'יתרה',    value:balance,       icon: balance>=0 ? '📈' : '📉', color: balance>=0 ? '#6366f1' : '#ef4444', bg: balance>=0 ? '#eef2ff' : '#fef2f2', border: balance>=0 ? '#c7d2fe' : '#fecaca' },
            ].map((c,i) => (
              <div key={i} style={{ background:c.bg, borderRadius:16, padding:'22px 24px', border:`1px solid ${c.border}`, animation:`fadeUp 0.3s ease ${i*0.08}s both` }}>
                <div style={{ fontSize:28, marginBottom:10 }}>{c.icon}</div>
                <div style={{ fontSize:28, fontWeight:800, color:c.color }}>
                  ₪{c.value.toLocaleString('he-IL', { minimumFractionDigits:0, maximumFractionDigits:0 })}
                </div>
                <div style={{ fontSize:13, color:'#64748b', marginTop:4 }}>{c.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
            {/* קטגוריות */}
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', padding:24 }}>
              <h3 style={{ margin:'0 0 18px', fontSize:15, fontWeight:700, color:'#1e293b' }}>הוצאות לפי קטגוריה</h3>
              {byCategory.length === 0
                ? <div style={{ textAlign:'center', color:'#94a3b8', padding:'30px 0' }}>אין הוצאות בתקופה זו</div>
                : byCategory.map(c => (
                  <div key={c.key} style={{ marginBottom:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:13, color:'#475569', display:'flex', gap:6, alignItems:'center' }}>
                        <span>{c.icon}</span>{c.label}
                      </span>
                      <span style={{ fontSize:13, fontWeight:700, color:c.color }}>₪{c.total.toLocaleString()}</span>
                    </div>
                    <div style={{ height:6, background:'#f1f5f9', borderRadius:10 }}>
                      <div style={{ height:'100%', width:`${totalExpenses>0 ? c.total/totalExpenses*100 : 0}%`, background:c.color, borderRadius:10, transition:'width 0.5s ease' }} />
                    </div>
                  </div>
                ))
              }
            </div>

            {/* יחס */}
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', padding:24 }}>
              <h3 style={{ margin:'0 0 18px', fontSize:15, fontWeight:700, color:'#1e293b' }}>יחס הכנסות / הוצאות</h3>
              {income===0 && totalExpenses===0
                ? <div style={{ textAlign:'center', color:'#94a3b8', padding:'30px 0' }}>אין נתונים בתקופה זו</div>
                : <>
                  {[
                    { label:'💰 הכנסות', value:income,        color:'#10b981', total:income+totalExpenses },
                    { label:'💸 הוצאות', value:totalExpenses, color:'#ef4444', total:income+totalExpenses },
                  ].map((b,i) => (
                    <div key={i} style={{ marginBottom:16 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ fontSize:13, color:b.color, fontWeight:600 }}>{b.label}</span>
                        <span style={{ fontSize:13, fontWeight:700, color:b.color }}>₪{b.value.toLocaleString()}</span>
                      </div>
                      <div style={{ height:10, background:'#f1f5f9', borderRadius:10 }}>
                        <div style={{ height:'100%', width:`${b.total>0 ? b.value/b.total*100 : 0}%`, background:b.color, borderRadius:10, transition:'width 0.5s ease' }} />
                      </div>
                    </div>
                  ))}
                  <div style={{ background: balance>=0 ? '#ecfdf5' : '#fef2f2', borderRadius:12, padding:'12px 16px', textAlign:'center', marginTop:8 }}>
                    <div style={{ fontSize:12, color:'#64748b' }}>רווח נקי</div>
                    <div style={{ fontSize:22, fontWeight:800, color: balance>=0 ? '#10b981' : '#ef4444', marginTop:2 }}>
                      {balance>=0 ? '+' : ''}₪{balance.toLocaleString()}
                    </div>
                  </div>
                </>
              }
            </div>
          </div>

          {/* רשימת הוצאות */}
          <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden' }}>
            <div style={{ padding:'18px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontWeight:700, fontSize:15, color:'#1e293b' }}>💸 רשימת הוצאות</span>
              <span style={{ fontSize:13, color:'#94a3b8' }}>{expenses.length} פעולות</span>
            </div>
            {expenses.length === 0
              ? <div style={{ padding:'40px 0', textAlign:'center', color:'#94a3b8' }}>אין הוצאות בתקופה זו</div>
              : expenses.map((e, i) => {
                const cat = EXP_CAT[e.category]
                return (
                  <div key={e.id} className="exp-row"
                    style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 24px', borderBottom: i<expenses.length-1 ? '1px solid #f8fafc' : 'none' }}>
                    <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                      <div style={{ width:38, height:38, borderRadius:10, background:`${cat.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                        {cat.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:14, color:'#1e293b' }}>{e.description}</div>
                        <div style={{ fontSize:12, color:'#94a3b8', marginTop:1 }}>{cat.label} · {e.paid_at}</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{ fontWeight:700, fontSize:15, color:'#ef4444' }}>-₪{(+e.amount).toLocaleString()}</span>
                      <button className="icon-btn" onClick={() => del(e.id)}
                        style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:15 }}>🗑️</button>
                    </div>
                  </div>
                )
              })
            }
          </div>
        </>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'#fff', borderRadius:20, padding:32, width:420, direction:'rtl', boxShadow:'0 24px 60px rgba(0,0,0,0.15)', animation:'fadeUp 0.25s ease' }}>
            <h2 style={{ margin:'0 0 24px', fontSize:18, fontWeight:800, color:'#0f172a' }}>➕ הוצאה חדשה</h2>

            <div style={{ marginBottom:14 }}>
              <label style={lbl}>תיאור *</label>
              <input style={inp} type="text" placeholder="לדוגמה: שכירות משרד" value={form.description}
                onChange={e => setForm(p => ({...p,description:e.target.value}))}
                onFocus={e => e.target.style.borderColor='#6366f1'}
                onBlur={e => e.target.style.borderColor='#e2e8f0'} />
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
                <label style={lbl}>תאריך</label>
                <input style={inp} type="date" value={form.paid_at}
                  onChange={e => setForm(p => ({...p,paid_at:e.target.value}))}
                  onFocus={e => e.target.style.borderColor='#6366f1'}
                  onBlur={e => e.target.style.borderColor='#e2e8f0'} />
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={lbl}>קטגוריה</label>
              <select style={inp} value={form.category} onChange={e => setForm(p => ({...p,category:e.target.value}))}>
                {Object.entries(EXP_CAT).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={lbl}>הערות</label>
              <input style={inp} type="text" placeholder="הערות נוספות..." value={form.notes}
                onChange={e => setForm(p => ({...p,notes:e.target.value}))}
                onFocus={e => e.target.style.borderColor='#6366f1'}
                onBlur={e => e.target.style.borderColor='#e2e8f0'} />
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={save} disabled={saving}
                style={{ flex:1, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontWeight:700, padding:'13px', borderRadius:12, cursor:'pointer', fontSize:15 }}>
                {saving ? 'שומר...' : 'שמור'}
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