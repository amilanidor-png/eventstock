import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Dashboard() {
  const [stats, setStats]     = useState({ customers: 0, equipment: 0, rentals: 0, active: 0 })
  const [rentals, setRentals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [c, e, r] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('equipment').select('id', { count: 'exact', head: true }),
        supabase.from('rentals').select('id', { count: 'exact', head: true }),
      ])
      const { data: active } = await supabase.from('rentals').select('id', { count: 'exact', head: true }).eq('status', 'active')
      const { data: recent } = await supabase
        .from('rentals')
        .select('id, status, start_date, end_date, customers(full_name)')
        .order('created_at', { ascending: false })
        .limit(5)

      setStats({ customers: c.count||0, equipment: e.count||0, rentals: r.count||0, active: active?.count||0 })
      setRentals(recent || [])
      setLoading(false)
    }
    load()
  }, [])

  const statusLabel = { draft:'טיוטה', confirmed:'מאושר', active:'פעיל', returned:'הוחזר', cancelled:'בוטל' }
  const statusColor = { draft:'#7a9bb5', confirmed:'#f8b942', active:'#22c55e', returned:'#a78bfa', cancelled:'#ef4444' }

  if (loading) return <div style={{ color:'#f8b942', fontSize:20 }}>⏳ טוען...</div>

  return (
    <div style={{ direction:'rtl' }}>
      <h1 style={s.title}>לוח בקרה</h1>
      <p style={s.date}>{new Date().toLocaleDateString('he-IL', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>

      {/* Stats */}
      <div style={s.grid}>
        {[
          { label:'לקוחות',       value: stats.customers, icon:'👤', color:'#3b82f6' },
          { label:'פריטי ציוד',   value: stats.equipment, icon:'📦', color:'#f8b942' },
          { label:'סה״כ השכרות', value: stats.rentals,   icon:'📋', color:'#a78bfa' },
          { label:'השכרות פעילות',value: stats.active,   icon:'🔑', color:'#22c55e' },
        ].map(s => (
          <div key={s.label} style={card}>
            <div style={{ fontSize:32 }}>{s.icon}</div>
            <div style={{ fontSize:32, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:13, color:'#4a6080' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent rentals */}
      <div style={table}>
        <h2 style={s.section}>השכרות אחרונות</h2>
        {rentals.length === 0
          ? <p style={{ color:'#4a6080' }}>אין השכרות עדיין</p>
          : rentals.map(r => (
            <div key={r.id} style={row}>
              <div>
                <div style={{ fontWeight:600 }}>{r.customers?.full_name || '—'}</div>
                <div style={{ fontSize:12, color:'#4a6080' }}>{r.start_date} → {r.end_date}</div>
              </div>
              <span style={{ background: statusColor[r.status]+'22', color: statusColor[r.status], padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600 }}>
                {statusLabel[r.status]}
              </span>
            </div>
          ))
        }
      </div>
    </div>
  )
}

const s = {
  title:   { margin:'0 0 4px', fontSize:26, fontWeight:800 },
  date:    { color:'#4a6080', fontSize:13, marginBottom:28 },
  grid:    { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:32 },
  section: { margin:'0 0 16px', fontSize:16, fontWeight:700 },
}
const card  = { background:'#111827', border:'1px solid #1e2d40', borderRadius:14, padding:'20px 22px', display:'flex', flexDirection:'column', gap:6 }
const table = { background:'#111827', border:'1px solid #1e2d40', borderRadius:14, padding:24 }
const row   = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid #1a2535' }