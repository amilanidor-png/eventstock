import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Dashboard() {
  const [stats, setStats]         = useState({ customers:0, equipment:0, rentals:0, active:0 })
  const [rentals, setRentals]     = useState([])
  const [returning, setReturning] = useState([])
  const [popular, setPopular]     = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().slice(0,10)

      const [c, e, r] = await Promise.all([
        supabase.from('customers').select('id', { count:'exact', head:true }),
        supabase.from('equipment').select('id', { count:'exact', head:true }),
        supabase.from('rentals').select('id', { count:'exact', head:true }),
      ])
      const { count: active } = await supabase.from('rentals')
        .select('id', { count:'exact', head:true }).eq('status','active')

      const { data: recent } = await supabase.from('rentals')
        .select('id, status, start_date, end_date, customers(full_name)')
        .order('created_at', { ascending:false }).limit(5)

      const { data: ret } = await supabase.from('rentals')
        .select('id, status, start_date, end_date, customers(full_name)')
        .eq('end_date', today).in('status', ['active','confirmed'])

      // דוח ציוד פופולרי
      const { data: popData } = await supabase
        .from('rental_items')
        .select('equipment_id, quantity, equipment(name, image_url, equipment_categories(icon))')

      // ריכוז לפי פריט
      const popMap = {}
      ;(popData || []).forEach(item => {
        const id = item.equipment_id
        if (!popMap[id]) popMap[id] = { id, name: item.equipment?.name, image_url: item.equipment?.image_url, icon: item.equipment?.equipment_categories?.icon || '📦', count: 0, qty: 0 }
        popMap[id].count += 1
        popMap[id].qty   += +item.quantity
      })
      const sorted = Object.values(popMap).sort((a,b) => b.count - a.count).slice(0,5)

      setStats({ customers:c.count||0, equipment:e.count||0, rentals:r.count||0, active:active||0 })
      setRentals(recent || [])
      setReturning(ret || [])
      setPopular(sorted)
      setLoading(false)
    }
    load()
  }, [])

  const STATUS_LABEL = { draft:'טיוטה', confirmed:'מאושר', active:'פעיל', returned:'הוחזר', cancelled:'בוטל' }
  const STATUS_COLOR = { draft:'#94a3b8', confirmed:'#f59e0b', active:'#10b981', returned:'#8b5cf6', cancelled:'#ef4444' }
  const STATUS_BG    = { draft:'#f8fafc', confirmed:'#fffbeb', active:'#ecfdf5', returned:'#f5f3ff', cancelled:'#fef2f2' }

  const STATS = [
    { label:'לקוחות',        value:stats.customers, icon:'👤', color:'#6366f1', bg:'#eef2ff' },
    { label:'פריטי ציוד',    value:stats.equipment, icon:'📦', color:'#f59e0b', bg:'#fffbeb' },
    { label:'סה״כ השכרות',  value:stats.rentals,   icon:'📋', color:'#8b5cf6', bg:'#f5f3ff' },
    { label:'השכרות פעילות', value:stats.active,    icon:'🔑', color:'#10b981', bg:'#ecfdf5' },
  ]

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
      <div style={{ width:32, height:32, border:'3px solid #e2e8f0', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  )

  const maxCount = popular[0]?.count || 1

  return (
    <div style={{ direction:'rtl' }}>
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px' }}>לוח בקרה</h1>
        <p style={{ color:'#94a3b8', fontSize:13, marginTop:4 }}>
          {new Date().toLocaleDateString('he-IL', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        </p>
      </div>

      {/* התראה */}
      {returning.length > 0 && (
        <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:14, padding:'16px 20px', marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <span style={{ fontSize:20 }}>⚠️</span>
            <span style={{ fontWeight:700, fontSize:15, color:'#92400e' }}>
              {returning.length} השכרה{returning.length > 1 ? 'ות' : ''} מסתיימ{returning.length > 1 ? 'ות' : 'ת'} היום
            </span>
          </div>
          {returning.map(r => (
            <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff', borderRadius:10, padding:'10px 14px', marginBottom:6 }}>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <span style={{ fontSize:18 }}>📦</span>
                <div>
                  <div style={{ fontWeight:600, fontSize:14, color:'#1e293b' }}>{r.customers?.full_name}</div>
                  <div style={{ fontSize:12, color:'#94a3b8' }}>{r.start_date} → {r.end_date}</div>
                </div>
              </div>
              <span style={{ background:STATUS_BG[r.status], color:STATUS_COLOR[r.status], padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600 }}>
                {STATUS_LABEL[r.status]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:16, marginBottom:28 }}>
        {STATS.map((s, i) => (
          <div key={i} className="card" style={{ background:'#fff', borderRadius:16, padding:'20px 22px', border:'1px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ width:40, height:40, borderRadius:12, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, marginBottom:14 }}>
              {s.icon}
            </div>
            <div style={{ fontSize:30, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:13, color:'#94a3b8', marginTop:6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        {/* ציוד פופולרי */}
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden' }}>
          <div style={{ padding:'18px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:16 }}>🏆</span>
            <span style={{ fontWeight:700, fontSize:15, color:'#1e293b' }}>ציוד פופולרי</span>
          </div>
          {popular.length === 0
            ? <div style={{ padding:'40px 24px', textAlign:'center', color:'#94a3b8' }}>אין נתונים עדיין</div>
            : popular.map((item, i) => (
              <div key={item.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 24px', borderBottom: i<popular.length-1 ? '1px solid #f8fafc' : 'none' }}>
                <div style={{ fontSize:18, fontWeight:800, color:'#cbd5e1', width:20, textAlign:'center' }}>{i+1}</div>
                <div style={{ width:36, height:36, borderRadius:10, overflow:'hidden', background:'#f8fafc', flexShrink:0 }}>
                  {item.image_url
                    ? <img src={item.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{item.icon}</div>
                  }
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
                  <div style={{ height:4, background:'#f1f5f9', borderRadius:10, marginTop:4 }}>
                    <div style={{ height:'100%', width:`${(item.count/maxCount)*100}%`, background:'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius:10, transition:'width 0.5s ease' }} />
                  </div>
                </div>
                <div style={{ fontSize:12, color:'#94a3b8', flexShrink:0 }}>{item.count} פעמים</div>
              </div>
            ))
          }
        </div>

        {/* השכרות אחרונות */}
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden' }}>
          <div style={{ padding:'18px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:16 }}>📋</span>
            <span style={{ fontWeight:700, fontSize:15, color:'#1e293b' }}>השכרות אחרונות</span>
          </div>
          {rentals.length === 0
            ? <div style={{ padding:'40px 24px', textAlign:'center', color:'#94a3b8' }}>
                <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
                <div>אין השכרות עדיין</div>
              </div>
            : rentals.map((r, i) => (
              <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 24px', borderBottom: i<rentals.length-1 ? '1px solid #f8fafc' : 'none', transition:'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <div>
                  <div style={{ fontWeight:600, fontSize:14, color:'#1e293b' }}>{r.customers?.full_name || '—'}</div>
                  <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>{r.start_date} → {r.end_date}</div>
                </div>
                <span style={{ background:STATUS_BG[r.status], color:STATUS_COLOR[r.status], padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600, border:`1px solid ${STATUS_COLOR[r.status]}22` }}>
                  {STATUS_LABEL[r.status]}
                </span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}