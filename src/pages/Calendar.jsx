import { useEffect, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import heLocale from '@fullcalendar/core/locales/he'
import { supabase } from '../supabaseClient'

const STATUS_COLOR = {
  draft:     '#94a3b8',
  confirmed: '#f59e0b',
  active:    '#10b981',
  returned:  '#8b5cf6',
  cancelled: '#ef4444',
}

const STATUS_LABEL = {
  draft:'טיוטה', confirmed:'מאושר', active:'פעיל', returned:'הוחזר', cancelled:'בוטל'
}

export default function Calendar() {
  const [events, setEvents]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('rentals')
        .select('id, status, start_date, end_date, notes, customers(full_name)')
        .not('status', 'eq', 'cancelled')
        .order('start_date')

      const mapped = (data || []).map(r => ({
        id:              r.id,
        title:           r.customers?.full_name || 'לקוח',
        start:           r.start_date,
        end:             r.end_date,
        backgroundColor: STATUS_COLOR[r.status] || '#6366f1',
        borderColor:     STATUS_COLOR[r.status] || '#6366f1',
        textColor:       '#fff',
        extendedProps:   { status: r.status, notes: r.notes, customer: r.customers?.full_name },
      }))
      setEvents(mapped)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ direction:'rtl' }}>
      <style>{`
        .fc { font-family: "Inter", "Segoe UI", sans-serif !important; direction: rtl; }
        .fc .fc-toolbar-title { font-size: 18px !important; font-weight: 800 !important; color: #0f172a; }
        .fc .fc-button { background: #fff !important; border: 1px solid #e2e8f0 !important; color: #475569 !important; border-radius: 8px !important; font-size: 13px !important; padding: 6px 12px !important; box-shadow: none !important; transition: all 0.15s !important; }
        .fc .fc-button:hover { background: #eef2ff !important; color: #6366f1 !important; border-color: #6366f1 !important; }
        .fc .fc-button-active { background: #eef2ff !important; color: #6366f1 !important; border-color: #6366f1 !important; font-weight: 700 !important; }
        .fc .fc-col-header-cell { background: #f8fafc; padding: 10px 0 !important; }
        .fc .fc-col-header-cell-cushion { color: #64748b !important; font-size: 13px !important; font-weight: 600 !important; text-decoration: none !important; }
        .fc .fc-daygrid-day-number { color: #475569 !important; font-size: 13px !important; text-decoration: none !important; padding: 6px 8px !important; }
        .fc .fc-daygrid-day.fc-day-today { background: #eef2ff !important; }
        .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-number { color: #6366f1 !important; font-weight: 800 !important; }
        .fc .fc-event { border-radius: 6px !important; padding: 2px 6px !important; font-size: 12px !important; font-weight: 600 !important; cursor: pointer !important; }
        .fc .fc-event:hover { opacity: 0.85; }
        .fc td, .fc th { border-color: #f1f5f9 !important; }
        .fc .fc-scrollgrid { border-color: #f1f5f9 !important; border-radius: 12px; overflow: hidden; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px' }}>לוח שנה</h1>
        <p style={{ color:'#94a3b8', fontSize:13, marginTop:4 }}>תצוגה ויזואלית של כל ההשכרות</p>
      </div>

      {/* מקרא */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        {Object.entries(STATUS_LABEL).filter(([k]) => k !== 'cancelled').map(([k, v]) => (
          <div key={k} style={{ display:'flex', alignItems:'center', gap:6, background:'#fff', border:'1px solid #f1f5f9', borderRadius:20, padding:'5px 12px', fontSize:12 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:STATUS_COLOR[k] }} />
            <span style={{ color:'#475569', fontWeight:500 }}>{v}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
          <div style={{ width:32, height:32, border:'3px solid #e2e8f0', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
        </div>
      ) : (
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', padding:20 }}>
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={heLocale}
            events={events}
            headerToolbar={{ start:'prev,next today', center:'title', end:'' }}
            height="auto"
            eventClick={({ event }) => setSelected({
              title:    event.title,
              start:    event.startStr,
              end:      event.endStr,
              status:   event.extendedProps.status,
              notes:    event.extendedProps.notes,
              customer: event.extendedProps.customer,
            })}
            dayMaxEvents={3}
            moreLinkText="עוד"
          />
        </div>
      )}

      {/* פופאפ פרטי השכרה */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(4px)' }}
          onClick={() => setSelected(null)}>
          <div style={{ background:'#fff', borderRadius:16, padding:28, width:340, boxShadow:'0 24px 60px rgba(0,0,0,0.15)', direction:'rtl' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <h3 style={{ margin:0, fontSize:17, fontWeight:800, color:'#0f172a' }}>{selected.customer}</h3>
              <button onClick={() => setSelected(null)}
                style={{ background:'#f1f5f9', border:'none', borderRadius:8, padding:'4px 8px', cursor:'pointer', color:'#94a3b8' }}>✕</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', background:'#f8fafc', borderRadius:10, padding:'10px 14px' }}>
                <span style={{ fontSize:13, color:'#94a3b8' }}>תאריכים</span>
                <span style={{ fontSize:13, fontWeight:600, color:'#1e293b' }}>{selected.start} → {selected.end}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', background:'#f8fafc', borderRadius:10, padding:'10px 14px' }}>
                <span style={{ fontSize:13, color:'#94a3b8' }}>סטטוס</span>
                <span style={{ fontSize:13, fontWeight:600, color: STATUS_COLOR[selected.status] }}>
                  {STATUS_LABEL[selected.status]}
                </span>
              </div>
              {selected.notes && (
                <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#92400e' }}>
                  📝 {selected.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}