import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const DEFAULT_TEMPLATE = (rental, customer) => `
<div style="font-family: Arial, sans-serif; direction: rtl; line-height: 1.8; color: #1e293b;">
  <h2 style="text-align:center; color:#6366f1;">חוזה השכרת ציוד אירועים</h2>
  <p style="text-align:center; color:#94a3b8; font-size:13px;">אוורסט — השכרת ציוד אירועים</p>
  <hr style="border:none; border-top:1px solid #e2e8f0; margin:20px 0;"/>

  <h3>פרטי הלקוח</h3>
  <p><strong>שם:</strong> ${customer?.full_name || '—'}</p>
  <p><strong>טלפון:</strong> ${customer?.phone || '—'}</p>
  <p><strong>כתובת:</strong> ${customer?.address || '—'}</p>

  <h3>פרטי ההשכרה</h3>
  <p><strong>תאריך התחלה:</strong> ${rental?.start_date || '—'}</p>
  <p><strong>תאריך סיום:</strong> ${rental?.end_date || '—'}</p>
  <p><strong>אופן איסוף:</strong> ${rental?.pickup_type === 'delivery' ? 'משלוח לכתובת: ' + (rental?.delivery_address || '—') : 'איסוף עצמי'}</p>
  ${rental?.notes ? `<p><strong>הערות:</strong> ${rental.notes}</p>` : ''}

  <h3>תנאים כלליים</h3>
  <ol style="padding-right: 20px;">
    <li>הציוד המושכר נמסר ללקוח במצב תקין ומלא.</li>
    <li>הלקוח מתחייב להחזיר את הציוד במצבו המקורי בתום תקופת ההשכרה.</li>
    <li>כל נזק לציוד במהלך תקופת ההשכרה יחויב ללקוח במלואו.</li>
    <li>איחור בהחזרת הציוד יגרור חיוב נוסף בהתאם לתעריף היומי.</li>
    <li>הציוד המושכר הוא רכוש חברת אוורסט ואסור להשאיל אותו לצד שלישי.</li>
    <li>במקרה של תקלה יש לפנות מיידית לחברת אוורסט.</li>
    <li>החברה שומרת לעצמה את הזכות לדרוש פיצוי בגין נזק שנגרם.</li>
  </ol>

  <p style="margin-top:24px; font-size:13px; color:#94a3b8;">
    חוזה זה נוצר ב-${new Date().toLocaleDateString('he-IL')} ומחייב את שני הצדדים.
  </p>
</div>
`

export default function ContractManager() {
  const [rentals, setRentals]     = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [selectedRental, setSelectedRental] = useState('')
  const [template, setTemplate]   = useState('')
  const [creating, setCreating]   = useState(false)

  const load = async () => {
    const [{ data: r }, { data: c }] = await Promise.all([
      supabase.from('rentals').select('*, customers(full_name, phone, address)').not('status','eq','cancelled').order('created_at', { ascending:false }),
      supabase.from('contracts').select('*, rentals(start_date, end_date, customers(full_name))').order('created_at', { ascending:false }),
    ])
    setRentals(r || [])
    setContracts(c || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openNew = () => {
    setSelectedRental('')
    setTemplate('')
    setModal(true)
  }

  const handleRentalSelect = (rentalId) => {
    setSelectedRental(rentalId)
    const rental   = rentals.find(r => r.id === rentalId)
    const customer = rental?.customers
    setTemplate(DEFAULT_TEMPLATE(rental, customer))
  }

  const createContract = async () => {
    if (!selectedRental || !template) return alert('נא לבחור הזמנה')
    setCreating(true)
    const { data, error } = await supabase.from('contracts').insert({
      rental_id:    selectedRental,
      content_html: template,
      sent_at:      new Date().toISOString(),
    }).select().single()

    if (error) { alert('שגיאה: ' + error.message); setCreating(false); return }

    await load()
    setModal(false)
    setCreating(false)

    // פתח קישור
    const link = `${window.location.origin}/contract/${data.id}`
    shareContract(link, rentals.find(r => r.id === selectedRental))
  }

  const shareContract = (link, rental) => {
    const customer = rental?.customers?.full_name || 'לקוח'
    const msg = `שלום ${customer} 👋\n\n*חוזה השכרה מאוורסט*\n\nנא לקרוא ולחתום על החוזה:\n${link}\n\nתודה! 🏔️`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const copyLink = (contractId) => {
    const link = `${window.location.origin}/contract/${contractId}`
    navigator.clipboard.writeText(link)
    alert('✅ הקישור הועתק!')
  }

  const del = async (id) => {
    if (!confirm('למחוק חוזה זה?')) return
    await supabase.from('contracts').delete().eq('id', id)
    setContracts(p => p.filter(c => c.id !== id))
  }

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
        .con-row { transition: background 0.15s; }
        .con-row:hover { background: #f8fafc !important; }
        .icon-btn { transition: all 0.15s; opacity:0.4; }
        .icon-btn:hover { opacity:1; }
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px' }}>חוזים</h1>
          <p style={{ color:'#94a3b8', fontSize:13, marginTop:3 }}>{contracts.length} חוזים בסך הכל</p>
        </div>
        <button onClick={openNew}
          style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontWeight:700, padding:'10px 20px', borderRadius:12, cursor:'pointer', fontSize:14, boxShadow:'0 4px 12px rgba(99,102,241,0.25)', transition:'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
          + חוזה חדש
        </button>
      </div>

      {/* רשימת חוזים */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden' }}>
        {contracts.length === 0
          ? <div style={{ padding:'60px 0', textAlign:'center', color:'#94a3b8' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>📄</div>
              <div>אין חוזים עדיין</div>
            </div>
          : contracts.map((c, i) => (
            <div key={c.id} className="con-row"
              style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 24px', borderBottom: i<contracts.length-1 ? '1px solid #f8fafc' : 'none', animation:`fadeUp 0.25s ease ${i*0.03}s both` }}>
              <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                <div style={{ width:40, height:40, borderRadius:12, background: c.signed_at ? '#ecfdf5' : '#eef2ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
                  {c.signed_at ? '✅' : '📄'}
                </div>
                <div>
                  <div style={{ fontWeight:600, fontSize:14, color:'#1e293b' }}>
                    {c.rentals?.customers?.full_name || '—'}
                  </div>
                  <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>
                    {c.rentals?.start_date} → {c.rentals?.end_date}
                    {c.signed_at && ` · נחתם: ${new Date(c.signed_at).toLocaleDateString('he-IL')}`}
                    {c.signed_by_name && ` על ידי ${c.signed_by_name}`}
                  </div>
                </div>
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:12, fontWeight:600, padding:'4px 12px', borderRadius:20, background: c.signed_at ? '#ecfdf5' : '#eef2ff', color: c.signed_at ? '#10b981' : '#6366f1' }}>
                  {c.signed_at ? 'נחתם' : 'ממתין לחתימה'}
                </span>

                {/* כפתור שיתוף */}
                {!c.signed_at && (
                  <button className="icon-btn"
                    onClick={() => shareContract(`${window.location.origin}/contract/${c.id}`, rentals.find(r => r.id === c.rental_id))}
                    style={{ background:'#25d366', border:'none', color:'#fff', borderRadius:8, padding:'6px 10px', cursor:'pointer', fontSize:13, fontWeight:600, opacity:1 }}>
                    📱
                  </button>
                )}

                <button className="icon-btn" onClick={() => copyLink(c.id)}
                  style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:16, padding:4 }}
                  title="העתק קישור">🔗</button>

                <button className="icon-btn" onClick={() => window.open(`/contract/${c.id}`, '_blank')}
                  style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:16, padding:4 }}
                  title="פתח חוזה">👁️</button>

                <button className="icon-btn" onClick={() => del(c.id)}
                  style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:16, padding:4 }}>🗑️</button>
              </div>
            </div>
          ))
        }
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'#fff', borderRadius:20, padding:32, width:560, maxHeight:'90vh', overflowY:'auto', direction:'rtl', boxShadow:'0 24px 60px rgba(0,0,0,0.15)', animation:'fadeUp 0.25s ease' }}>
            <h2 style={{ margin:'0 0 24px', fontSize:18, fontWeight:800, color:'#0f172a' }}>📄 חוזה חדש</h2>

            <div style={{ marginBottom:16 }}>
              <label style={lbl}>בחר הזמנה *</label>
              <select style={inp} value={selectedRental} onChange={e => handleRentalSelect(e.target.value)}>
                <option value="">-- בחר הזמנה --</option>
                {rentals.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.customers?.full_name} — {r.start_date} עד {r.end_date}
                  </option>
                ))}
              </select>
            </div>

            {template && (
              <div style={{ marginBottom:16 }}>
                <label style={lbl}>תוכן החוזה (ניתן לעריכה)</label>
                <textarea value={template} onChange={e => setTemplate(e.target.value)}
                  style={{ ...inp, height:200, resize:'vertical', fontFamily:'monospace', fontSize:12 }} />
              </div>
            )}

            {template && (
              <div style={{ background:'#f8fafc', borderRadius:10, padding:16, marginBottom:16, fontSize:12, color:'#64748b' }}>
                <strong>תצוגה מקדימה:</strong>
                <div style={{ marginTop:8, border:'1px solid #e2e8f0', borderRadius:8, padding:12, background:'#fff' }}
                  dangerouslySetInnerHTML={{ __html: template }} />
              </div>
            )}

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={createContract} disabled={creating || !selectedRental}
                style={{ flex:1, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontWeight:700, padding:'13px', borderRadius:12, cursor:'pointer', fontSize:15 }}>
                {creating ? 'יוצר...' : '📱 צור ושלח ב-WhatsApp'}
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