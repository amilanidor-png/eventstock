import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const SUPA_URL = 'https://jeaizwuqxclvayfdbtcn.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplYWl6d3VxeGNsdmF5ZmRidGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTE3ODYsImV4cCI6MjA5NTM4Nzc4Nn0.Vtpq8pZ5o1SgIaaKVTtTRUgsu3hyIRQHYUccT8rl35c'

function authHeaders() {
  const tokenStr = localStorage.getItem('sb-jeaizwuqxclvayfdbtcn-auth-token')
  const token = tokenStr ? JSON.parse(tokenStr) : null
  return {
    apikey: SUPA_KEY,
    Authorization: 'Bearer ' + (token?.access_token || SUPA_KEY),
    'Content-Type': 'application/json'
  }
}
const supaGet = async (path) => {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, { headers: authHeaders() })
    return await res.json()
  } catch (e) { console.error('supaGet error:', path, e); return [] }
}

const T = {
  bg:'#0d0d0d', surface:'#161616', card:'#1a1a1a', border:'#2a2a2a',
  red:'#e53935', redDark:'#b71c1c', redGlow:'rgba(229,57,53,0.18)',
  text:'#f0f0f0', muted:'#888',
  neo:'inset 2px 2px 5px rgba(0,0,0,0.6), inset -2px -2px 5px rgba(255,255,255,0.04)',
  neoOut:'4px 4px 10px rgba(0,0,0,0.6), -2px -2px 6px rgba(255,255,255,0.03)',
}

const PERIODS = [
  { key:'day', label:'היום' }, { key:'week', label:'שבוע' },
  { key:'month', label:'חודש' }, { key:'year', label:'שנה' }, { key:'all', label:'מאז הקמה' },
]

const EMPTY_EXP = { amount:'', category_id:'', description:'', paid_at:new Date().toISOString().slice(0,10), notes:'' }

function getPeriodRange(p) {
  const now=new Date(), pad=n=>String(n).padStart(2,'0'), fmt=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`, today=fmt(now)
  if (p==='day')   return { from:today, to:today }
  if (p==='week')  { const d=new Date(now); d.setDate(d.getDate()-6);  return { from:fmt(d), to:today } }
  if (p==='month') { const d=new Date(now); d.setDate(d.getDate()-29); return { from:fmt(d), to:today } }
  if (p==='year')  { const d=new Date(now); d.setFullYear(d.getFullYear()-1); return { from:fmt(d), to:today } }
  return { from:'2000-01-01', to:today }
}

function exportToCSV({ payments, expenses, cats, income, totalExpenses, balance, periodLabel }) {
  const BOM='\uFEFF', rows=[]
  rows.push(['דוח מצב עסק — אוורסט']); rows.push([`תקופה: ${periodLabel}`]); rows.push([`תאריך: ${new Date().toLocaleDateString('he-IL')}`]); rows.push([])
  rows.push(['סיכום']); rows.push(['הכנסות',`₪${income.toLocaleString()}`]); rows.push(['הוצאות',`₪${totalExpenses.toLocaleString()}`]); rows.push(['יתרה',`₪${balance.toLocaleString()}`]); rows.push([])
  rows.push(['הכנסות']); rows.push(['תאריך','סכום','אסמכתה'])
  payments.forEach(p=>rows.push([p.paid_at,p.amount,p.reference||'']))
  rows.push([]); rows.push(['הוצאות']); rows.push(['תאריך','תיאור','קטגוריה','סכום'])
  expenses.forEach(e=>{ const cat=cats.find(c=>c.id===e.category_id); rows.push([e.paid_at,e.description,cat?.name||'—',e.amount]) })
  const csv=BOM+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}), url=URL.createObjectURL(blob), a=document.createElement('a')
  a.href=url; a.download=`אוורסט-דוח-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url)
}

const inp = { width:'100%', background:'#111', border:`1px solid #333`, color:T.text, borderRadius:10, padding:'11px 14px', fontSize:14, outline:'none', boxSizing:'border-box', transition:'all 0.2s' }
const lbl = { display:'block', fontSize:11, fontWeight:700, color:T.muted, marginBottom:6, letterSpacing:1.5, textTransform:'uppercase' }

export default function Business() {
  const [period, setPeriod]       = useState('month')
  const [income, setIncome]       = useState(0)
  const [payments, setPayments]   = useState([])
  const [expenses, setExpenses]   = useState([])
  const [cats, setCats]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [exporting, setExporting] = useState(false)
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(EMPTY_EXP)
  const [saving, setSaving]       = useState(false)

  const load = async () => {
    setLoading(true)
    const { from, to } = getPeriodRange(period)
    const [pays, exps, catsData] = await Promise.all([
      supaGet(`payments?select=*&paid_at=gte.${from}&paid_at=lte.${to}T23:59:59&order=paid_at.desc`),
      supaGet(`expenses?select=*,expense_categories(id,name,icon,color)&paid_at=gte.${from}&paid_at=lte.${to}&order=paid_at.desc`),
      supaGet('expense_categories?select=*&order=name'),
    ])
    const paysArr = Array.isArray(pays) ? pays : []
    const expsArr = Array.isArray(exps) ? exps : []
    const catsArr = Array.isArray(catsData) ? catsData : []
    setPayments(paysArr)
    setIncome(paysArr.reduce((s,p)=>s+ +p.amount,0))
    setExpenses(expsArr)
    setCats(catsArr)
    setLoading(false)
  }
  useEffect(() => { load() }, [period])

  const totalExpenses = expenses.reduce((s,e)=>s+ +e.amount,0)
  const balance       = income - totalExpenses

  const byCategory = cats.map(cat => ({
    ...cat, total: expenses.filter(e=>e.category_id===cat.id).reduce((s,e)=>s+ +e.amount,0)
  })).filter(c=>c.total>0).sort((a,b)=>b.total-a.total)

  const handleExport = () => {
    setExporting(true)
    exportToCSV({ payments, expenses, cats, income, totalExpenses, balance, periodLabel: PERIODS.find(p=>p.key===period)?.label||period })
    setTimeout(()=>setExporting(false),1000)
  }

  const save = async () => {
    if (!form.amount||!form.description) return alert('נא למלא סכום ותיאור')
    setSaving(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      await fetch(`${SUPA_URL}/rest/v1/expenses`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ ...form, amount:+form.amount, created_by:user?.id })
      })
    } catch (e) { console.error('save error:', e) }
    await load(); setModal(false); setForm(EMPTY_EXP); setSaving(false)
  }

  const del = async (id) => {
    if (!confirm('למחוק?')) return
    try {
      await fetch(`${SUPA_URL}/rest/v1/expenses?id=eq.${id}`, { method: 'DELETE', headers: authHeaders() })
    } catch (e) { console.error('delete error:', e) }
    setExpenses(p=>p.filter(e=>e.id!==id))
  }

  return (
    <div style={{ direction:'rtl', color:T.text }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .chip{transition:all 0.15s;cursor:pointer;}
        .chip:hover{border-color:${T.red}!important;color:${T.red}!important;}
        .exp-row{transition:background 0.15s;}
        .exp-row:hover{background:rgba(229,57,53,0.05)!important;}
        .icon-btn{transition:all 0.15s;opacity:0.4;background:transparent;border:none;cursor:pointer;font-size:15px;padding:4px;}
        .icon-btn:hover{opacity:1;}
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
            <div style={{ width:4, height:28, background:`linear-gradient(${T.red},${T.redDark})`, borderRadius:4 }} />
            <h1 style={{ fontSize:26, fontWeight:900, color:T.text, letterSpacing:1 }}>מצב העסק</h1>
          </div>
          <p style={{ color:T.muted, fontSize:13, paddingRight:16 }}>סקירה פיננסית</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={handleExport} disabled={exporting}
            style={{ background:T.card, border:`1px solid ${T.border}`, color:T.muted, fontWeight:600, padding:'10px 16px', borderRadius:12, cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:6, boxShadow:T.neoOut, transition:'all 0.2s' }}
            onMouseEnter={e=>e.currentTarget.style.borderColor=T.red}
            onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
            {exporting?'⏳':'📊'} ייצוא
          </button>
          <button className="neo-btn" onClick={() => { setForm({...EMPTY_EXP,category_id:cats[0]?.id||''}); setModal(true) }}
            style={{ padding:'10px 20px', fontSize:14, borderRadius:12 }}>
            + הוצאה חדשה
          </button>
        </div>
      </div>

      {/* Period */}
      <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' }}>
        {PERIODS.map(p => (
          <button key={p.key} className="chip" onClick={() => setPeriod(p.key)}
            style={{ padding:'7px 16px', borderRadius:20, border:'1px solid', fontSize:12, fontWeight:600,
              borderColor: period===p.key ? T.red : T.border,
              background:  period===p.key ? T.redGlow : T.card,
              color:       period===p.key ? T.red : T.muted,
              boxShadow:   period===p.key ? `0 0 10px ${T.redGlow}` : T.neoOut }}>
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:80 }}>
          <div style={{ width:36, height:36, border:`3px solid ${T.border}`, borderTop:`3px solid ${T.red}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        </div>
      ) : <>
        {/* KPI */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:28 }}>
          {[
            { label:'הכנסות', value:income,        icon:'💰', color:'#10b981', border:'rgba(16,185,129,0.2)' },
            { label:'הוצאות', value:totalExpenses, icon:'💸', color:T.red,    border:'rgba(229,57,53,0.2)' },
            { label:'יתרה',   value:balance,       icon:balance>=0?'📈':'📉', color:balance>=0?'#8b5cf6':T.red, border:balance>=0?'rgba(139,92,246,0.2)':'rgba(229,57,53,0.2)' },
          ].map((c,i) => (
            <div key={i} style={{ background:T.card, borderRadius:16, padding:'22px 24px', border:`1px solid ${c.border}`, boxShadow:T.neoOut, animation:`fadeUp 0.3s ease ${i*0.08}s both` }}>
              <div style={{ fontSize:28, marginBottom:10 }}>{c.icon}</div>
              <div style={{ fontSize:28, fontWeight:900, color:c.color, textShadow:`0 0 20px ${c.color}44` }}>
                ₪{c.value.toLocaleString('he-IL',{minimumFractionDigits:0})}
              </div>
              <div style={{ fontSize:12, color:T.muted, marginTop:6, letterSpacing:0.5 }}>{c.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
          {/* קטגוריות */}
          <div style={{ background:T.card, borderRadius:16, border:`1px solid ${T.border}`, boxShadow:T.neoOut, padding:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
              <div style={{ width:4, height:18, background:`linear-gradient(${T.red},${T.redDark})`, borderRadius:4 }} />
              <span style={{ fontWeight:700, fontSize:14, color:T.text }}>הוצאות לפי קטגוריה</span>
            </div>
            {byCategory.length===0
              ? <div style={{ textAlign:'center', color:T.muted, padding:'30px 0', fontSize:12 }}>אין הוצאות</div>
              : byCategory.map(c => (
                <div key={c.id} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:12, color:T.muted, display:'flex', gap:6 }}><span>{c.icon}</span>{c.name}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:c.color||T.red }}>₪{c.total.toLocaleString()}</span>
                  </div>
                  <div style={{ height:4, background:T.border, borderRadius:10 }}>
                    <div style={{ height:'100%', width:`${totalExpenses>0?c.total/totalExpenses*100:0}%`, background:c.color||T.red, borderRadius:10, transition:'width 0.6s ease', boxShadow:`0 0 8px ${c.color||T.red}66` }} />
                  </div>
                </div>
              ))
            }
          </div>

          {/* יחס */}
          <div style={{ background:T.card, borderRadius:16, border:`1px solid ${T.border}`, boxShadow:T.neoOut, padding:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
              <div style={{ width:4, height:18, background:`linear-gradient(${T.red},${T.redDark})`, borderRadius:4 }} />
              <span style={{ fontWeight:700, fontSize:14, color:T.text }}>יחס הכנסות / הוצאות</span>
            </div>
            {income===0 && totalExpenses===0
              ? <div style={{ textAlign:'center', color:T.muted, padding:'30px 0', fontSize:12 }}>אין נתונים</div>
              : <>
                {[
                  { label:'💰 הכנסות', val:income,        color:'#10b981' },
                  { label:'💸 הוצאות', val:totalExpenses, color:T.red },
                ].map((b,i) => (
                  <div key={i} style={{ marginBottom:16 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                      <span style={{ fontSize:12, color:b.color, fontWeight:700 }}>{b.label}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:b.color }}>₪{b.val.toLocaleString()}</span>
                    </div>
                    <div style={{ height:8, background:T.border, borderRadius:10 }}>
                      <div style={{ height:'100%', width:`${(income+totalExpenses)>0?b.val/(income+totalExpenses)*100:0}%`, background:b.color, borderRadius:10, transition:'width 0.6s', boxShadow:`0 0 10px ${b.color}55` }} />
                    </div>
                  </div>
                ))}
                <div style={{ background:`${balance>=0?'rgba(139,92,246,0.08)':T.redGlow}`, borderRadius:12, padding:'14px 18px', textAlign:'center', border:`1px solid ${balance>=0?'rgba(139,92,246,0.2)':'rgba(229,57,53,0.2)'}`, marginTop:8 }}>
                  <div style={{ fontSize:10, color:T.muted, letterSpacing:1, textTransform:'uppercase' }}>רווח נקי</div>
                  <div style={{ fontSize:24, fontWeight:900, color:balance>=0?'#8b5cf6':T.red, marginTop:4, textShadow:`0 0 20px ${balance>=0?'rgba(139,92,246,0.4)':T.redGlow}` }}>
                    {balance>=0?'+':''}₪{balance.toLocaleString()}
                  </div>
                </div>
              </>
            }
          </div>
        </div>

        {/* רשימת הוצאות */}
        <div style={{ background:T.card, borderRadius:16, border:`1px solid ${T.border}`, boxShadow:T.neoOut, overflow:'hidden' }}>
          <div style={{ padding:'16px 22px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:4, height:18, background:`linear-gradient(${T.red},${T.redDark})`, borderRadius:4 }} />
              <span style={{ fontWeight:700, fontSize:14, color:T.text }}>רשימת הוצאות</span>
            </div>
            <span style={{ fontSize:11, color:T.muted }}>{expenses.length} פעולות</span>
          </div>
          {expenses.length===0
            ? <div style={{ padding:'40px 0', textAlign:'center', color:T.muted, fontSize:12, letterSpacing:1 }}>אין הוצאות בתקופה זו</div>
            : expenses.map((e,i) => {
              const cat=e.expense_categories
              return (
                <div key={e.id} className="exp-row"
                  style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 22px', borderBottom:i<expenses.length-1?`1px solid ${T.border}`:'none' }}>
                  <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:`${cat?.color||T.red}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, border:`1px solid ${cat?.color||T.red}33` }}>
                      {cat?.icon||'📦'}
                    </div>
                    <div>
                      <div style={{ fontWeight:600, fontSize:13, color:T.text }}>{e.description}</div>
                      <div style={{ fontSize:11, color:T.muted, marginTop:1 }}>{cat?.name||'—'} · {e.paid_at}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontWeight:800, fontSize:15, color:T.red }}>-₪{(+e.amount).toLocaleString()}</span>
                    <button className="icon-btn" onClick={() => del(e.id)}>🗑️</button>
                  </div>
                </div>
              )
            })
          }
        </div>
      </>}

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(8px)' }}>
          <div style={{ background:T.surface, borderRadius:20, padding:32, width:420, direction:'rtl', boxShadow:`0 24px 60px rgba(0,0,0,0.9),0 0 40px ${T.redGlow}`, border:`1px solid ${T.border}`, animation:'fadeUp 0.25s ease' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
              <div style={{ width:4, height:22, background:`linear-gradient(${T.red},${T.redDark})`, borderRadius:4 }} />
              <h2 style={{ margin:0, fontSize:17, fontWeight:900, color:T.text }}>הוצאה חדשה</h2>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={lbl}>תיאור *</label>
              <input style={{ ...inp, background:T.card, boxShadow:T.neo }} type="text" placeholder="לדוגמה: שכירות משרד" value={form.description}
                onChange={e=>setForm(p=>({...p,description:e.target.value}))} onFocus={e=>e.target.style.borderColor=T.red} onBlur={e=>e.target.style.borderColor='#333'} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              <div>
                <label style={lbl}>סכום (₪) *</label>
                <input style={{ ...inp, background:T.card, boxShadow:T.neo }} type="number" placeholder="0" value={form.amount}
                  onChange={e=>setForm(p=>({...p,amount:e.target.value}))} onFocus={e=>e.target.style.borderColor=T.red} onBlur={e=>e.target.style.borderColor='#333'} />
              </div>
              <div>
                <label style={lbl}>תאריך</label>
                <input style={{ ...inp, background:T.card, boxShadow:T.neo }} type="date" value={form.paid_at}
                  onChange={e=>setForm(p=>({...p,paid_at:e.target.value}))} onFocus={e=>e.target.style.borderColor=T.red} onBlur={e=>e.target.style.borderColor='#333'} />
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>קטגוריה</label>
              <select style={{ ...inp, background:T.card, boxShadow:T.neo }} value={form.category_id} onChange={e=>setForm(p=>({...p,category_id:e.target.value}))}>
                <option value="">-- בחר קטגוריה --</option>
                {cats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={lbl}>הערות</label>
              <input style={{ ...inp, background:T.card, boxShadow:T.neo }} type="text" placeholder="הערות..." value={form.notes}
                onChange={e=>setForm(p=>({...p,notes:e.target.value}))} onFocus={e=>e.target.style.borderColor=T.red} onBlur={e=>e.target.style.borderColor='#333'} />
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="neo-btn" onClick={save} disabled={saving} style={{ flex:1, padding:'13px', fontSize:15, borderRadius:12 }}>
                {saving?'שומר...':'שמור'}
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