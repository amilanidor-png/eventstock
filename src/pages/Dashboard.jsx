import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const T = {
  bg:'#0d0d0d', surface:'#161616', card:'#1a1a1a', border:'#2a2a2a',
  red:'#e53935', redDark:'#b71c1c', redGlow:'rgba(229,57,53,0.18)',
  text:'#f0f0f0', muted:'#888',
  neoOut:'4px 4px 10px rgba(0,0,0,0.6), -2px -2px 6px rgba(255,255,255,0.03)',
}

const Card = ({ children, style }) => (
  <div className="neo-card" style={{ background:T.card, borderRadius:16, border:`1px solid ${T.border}`, boxShadow:T.neoOut, ...style }}>
    {children}
  </div>
)

export default function Dashboard() {
  const [stats, setStats]         = useState({ customers:0, equipment:0, rentals:0, active:0 })
  const [rentals, setRentals]     = useState([])
  const [returning, setReturning] = useState([])
  const [upcoming, setUpcoming]   = useState([])
  const [popular, setPopular]     = useState([])
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    const load = async () => {
      const today    = new Date()
      const todayStr = today.toISOString().slice(0,10)
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1)
      const dayAfter  = new Date(today); dayAfter.setDate(dayAfter.getDate()+2)
      const tomorrowStr = tomorrow.toISOString().slice(0,10)
      const dayAfterStr = dayAfter.toISOString().slice(0,10)

      const [c, e, r] = await Promise.all([
        supabase.from('customers').select('id', { count:'exact', head:true }),
        supabase.from('equipment').select('id', { count:'exact', head:true }),
        supabase.from('rentals').select('id', { count:'exact', head:true }),
      ])
      const { count: active } = await supabase.from('rentals').select('id', { count:'exact', head:true }).eq('status','active')
      const { data: recent }  = await supabase.from('rentals').select('id, status, start_date, end_date, customers(full_name)').order('created_at', { ascending:false }).limit(5)
      const { data: ret }     = await supabase.from('rentals').select('id, status, start_date, end_date, customers(full_name)').eq('end_date', todayStr).in('status', ['active','confirmed'])
      const { data: upc }     = await supabase.from('rentals').select('id, status, start_date, end_date, customers(full_name), pickup_type').in('start_date', [tomorrowStr, dayAfterStr]).in('status', ['confirmed','draft'])
      const { data: popData } = await supabase.from('rental_items').select('equipment_id, quantity, equipment(name, image_url, equipment_categories(icon))')

      const popMap = {}
      ;(popData||[]).forEach(item => {
        const id = item.equipment_id
        if (!popMap[id]) popMap[id] = { id, name:item.equipment?.name, image_url:item.equipment?.image_url, icon:item.equipment?.equipment_categories?.icon||'📦', count:0 }
        popMap[id].count += 1
      })

      setStats({ customers:c.count||0, equipment:e.count||0, rentals:r.count||0, active:active||0 })
      setRentals(recent||[])
      setReturning(ret||[])
      setUpcoming(upc||[])
      setPopular(Object.values(popMap).sort((a,b) => b.count - a.count).slice(0,5))
      setLoading(false)
    }
    load()
  }, [])

  const STATUS_LABEL = { draft:'טיוטה', confirmed:'מאושר', active:'פעיל', returned:'הוחזר', cancelled:'בוטל' }
  const STATUS_COLOR = { draft:'#555', confirmed:'#f59e0b', active:'#10b981', returned:'#8b5cf6', cancelled:'#e53935' }

  const shareReminder = (r) => {
    const msg = `שלום ${r.customers?.full_name} 👋\n\n*תזכורת מאוורסט* 🏔️\nהאירוע שלך מתחיל *מחר* — ${r.start_date}\n${r.pickup_type === 'delivery' ? '🚚 נדאג למשלוח' : '📦 אנא הגע לאיסוף עצמי'}\n\nלשאלות — דברו איתנו!`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:80 }}>
      <div style={{ width:36, height:36, border:`3px solid ${T.border}`, borderTop:`3px solid ${T.red}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  )

  const maxCount = popular[0]?.count || 1

  return (
    <div style={{ direction:'rtl', color:T.text }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        .neo-card { transition: box-shadow 0.2s, transform 0.2s; }
        .neo-card:hover { box-shadow: 6px 6px 16px rgba(0,0,0,0.7), -2px -2px 8px rgba(255,255,255,0.04), 0 0 20px rgba(229,57,53,0.15) !important; transform: translateY(-2px); }
        .row-hover { transition: background 0.15s; }
        .row-hover:hover { background: rgba(229,57,53,0.05) !important; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
          <div style={{ width:4, height:28, background:`linear-gradient(${T.red},${T.redDark})`, borderRadius:4 }} />
          <h1 style={{ fontSize:26, fontWeight:900, color:T.text, letterSpacing:1 }}>לוח בקרה</h1>
        </div>
        <p style={{ color:T.muted, fontSize:13, paddingRight:16 }}>
          {new Date().toLocaleDateString('he-IL', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        </p>
      </div>

      {/* התראות */}
      {returning.length > 0 && (
        <div style={{ background:`rgba(229,57,53,0.08)`, border:`1px solid rgba(229,57,53,0.25)`, borderRadius:14, padding:'16px 20px', marginBottom:16, animation:'fadeUp 0.3s ease' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <span style={{ fontSize:18 }}>⚠️</span>
            <span style={{ fontWeight:700, fontSize:14, color:T.red, letterSpacing:0.5 }}>
              {returning.length} השכרה{returning.length > 1 ? 'ות' : ''} מסתיימ{returning.length > 1 ? 'ות' : 'ת'} היום
            </span>
          </div>
          {returning.map(r => (
            <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:T.card, borderRadius:10, padding:'10px 14px', marginBottom:6, border:`1px solid ${T.border}` }}>
              <div>
                <div style={{ fontWeight:600, fontSize:13, color:T.text }}>{r.customers?.full_name}</div>
                <div style={{ fontSize:11, color:T.muted }}>{r.start_date} → {r.end_date}</div>
              </div>
              <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, background:`rgba(229,57,53,0.15)`, color:T.red }}>
                {STATUS_LABEL[r.status]}
              </span>
            </div>
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ background:`rgba(16,185,129,0.06)`, border:`1px solid rgba(16,185,129,0.2)`, borderRadius:14, padding:'16px 20px', marginBottom:20, animation:'fadeUp 0.3s ease' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <span style={{ fontSize:18 }}>📅</span>
            <span style={{ fontWeight:700, fontSize:14, color:'#10b981' }}>
              {upcoming.length} אירוע{upcoming.length > 1 ? 'ים' : ''} מתחיל{upcoming.length > 1 ? 'ים' : ''} בקרוב
            </span>
          </div>
          {upcoming.map(r => {
            const isTomorrow = r.start_date === new Date(Date.now()+86400000).toISOString().slice(0,10)
            return (
              <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:T.card, borderRadius:10, padding:'10px 14px', marginBottom:6, border:`1px solid ${T.border}` }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13, color:T.text }}>{r.customers?.full_name}</div>
                  <div style={{ fontSize:11, color:T.muted }}>{isTomorrow ? '⭐ מחר' : 'מחרתיים'} — {r.start_date}</div>
                </div>
                <button onClick={() => shareReminder(r)}
                  style={{ background:'#25d366', border:'none', color:'#fff', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                  📱 תזכורת
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:14, marginBottom:28 }}>
        {[
          { label:'לקוחות',        value:stats.customers, icon:'👤', color:'#6366f1' },
          { label:'פריטי ציוד',    value:stats.equipment, icon:'📦', color:'#f59e0b' },
          { label:'סה״כ השכרות',  value:stats.rentals,   icon:'📋', color:'#8b5cf6' },
          { label:'השכרות פעילות', value:stats.active,    icon:'🔑', color:T.red },
        ].map((s,i) => (
          <div key={i} className="neo-card" style={{ background:T.card, borderRadius:16, padding:'20px', border:`1px solid ${T.border}`, boxShadow:T.neoOut, animation:`fadeUp 0.3s ease ${i*0.08}s both` }}>
            <div style={{ fontSize:26, marginBottom:12 }}>{s.icon}</div>
            <div style={{ fontSize:32, fontWeight:900, color:s.color, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{s.value}</div>
            <div style={{ fontSize:12, color:T.muted, marginTop:6, letterSpacing:0.5 }}>{s.label}</div>
            <div style={{ height:2, background:T.border, borderRadius:2, marginTop:12 }}>
              <div style={{ height:'100%', width:`${Math.min(100,(s.value/20)*100)}%`, background:`linear-gradient(90deg,${s.color},${s.color}88)`, borderRadius:2, transition:'width 1s ease' }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* ציוד פופולרי */}
        <Card>
          <div style={{ padding:'18px 22px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:`linear-gradient(135deg,${T.red},${T.redDark})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🏆</div>
            <span style={{ fontWeight:700, fontSize:14, color:T.text, letterSpacing:0.5 }}>ציוד פופולרי</span>
          </div>
          {popular.length === 0
            ? <div style={{ padding:'40px', textAlign:'center', color:T.muted }}>אין נתונים</div>
            : popular.map((item,i) => (
              <div key={item.id} className="row-hover" style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 22px', borderBottom: i<popular.length-1 ? `1px solid ${T.border}` : 'none' }}>
                <div style={{ fontSize:16, fontWeight:900, color:T.border, width:18 }}>{i+1}</div>
                <div style={{ width:34, height:34, borderRadius:8, overflow:'hidden', background:T.surface, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
                  {item.image_url ? <img src={item.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : item.icon}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:12, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
                  <div style={{ height:3, background:T.border, borderRadius:2, marginTop:5 }}>
                    <div style={{ height:'100%', width:`${(item.count/maxCount)*100}%`, background:`linear-gradient(90deg,${T.red},${T.redDark})`, borderRadius:2, transition:'width 0.8s ease', boxShadow:`0 0 6px ${T.redGlow}` }} />
                  </div>
                </div>
                <div style={{ fontSize:11, color:T.muted, flexShrink:0 }}>{item.count}×</div>
              </div>
            ))
          }
        </Card>

        {/* השכרות אחרונות */}
        <Card>
          <div style={{ padding:'18px 22px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:`linear-gradient(135deg,${T.red},${T.redDark})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>📋</div>
            <span style={{ fontWeight:700, fontSize:14, color:T.text, letterSpacing:0.5 }}>השכרות אחרונות</span>
          </div>
          {rentals.length === 0
            ? <div style={{ padding:'40px', textAlign:'center', color:T.muted }}>אין השכרות</div>
            : rentals.map((r,i) => (
              <div key={r.id} className="row-hover" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 22px', borderBottom: i<rentals.length-1 ? `1px solid ${T.border}` : 'none' }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13, color:T.text }}>{r.customers?.full_name||'—'}</div>
                  <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{r.start_date} → {r.end_date}</div>
                </div>
                <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, background:`${STATUS_COLOR[r.status]}22`, color:STATUS_COLOR[r.status], border:`1px solid ${STATUS_COLOR[r.status]}44` }}>
                  {STATUS_LABEL[r.status]}
                </span>
              </div>
            ))
          }
        </Card>
      </div>
    </div>
  )
}