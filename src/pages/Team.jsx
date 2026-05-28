import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const ROLE_LABEL = { owner:'בעלים', manager:'מנהל', staff:'עובד' }
const ROLE_COLOR = { owner:'#6366f1', manager:'#f59e0b', staff:'#10b981' }
const ROLE_BG    = { owner:'#eef2ff', manager:'#fffbeb', staff:'#ecfdf5' }
const COLORS     = ['#6366f1','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6','#3b82f6']
const EMPTY      = { email:'', full_name:'', role:'staff', color:'#6366f1', phone:'' }

export default function Team() {
  const [members, setMembers]       = useState([])
  const [pending, setPending]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(false)
  const [form, setForm]             = useState(EMPTY)
  const [saving, setSaving]         = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [inviteLink, setInviteLink] = useState('')

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('pending_staff').select('*').eq('used', false).order('created_at', { ascending:false }),
    ])
    setMembers(m || [])
    setPending(p || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const addPending = async () => {
    if (!form.email || !form.full_name) return alert('נא למלא אימייל ושם')
    setSaving(true)
    const { error } = await supabase.from('pending_staff').upsert({
      email:     form.email,
      full_name: form.full_name,
      role:      form.role,
      color:     form.color,
      phone:     form.phone || null,
      used:      false,
    })
    if (error) { alert('שגיאה: ' + error.message); setSaving(false); return }

    const link = `${window.location.origin}?invite=${encodeURIComponent(form.email)}`
    setInviteLink(link)
    await load()
    setSaving(false)
  }

  const shareInvite = () => {
    if (!inviteLink) return
    const msg = `שלום ${form.full_name} 👋\n\nהוזמנת להצטרף למערכת אוורסט!\n\nלחץ על הקישור להרשמה:\n${inviteLink}\n\nתודה! 🏔️`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const updateRole = async (id, role) => {
    await supabase.from('profiles').update({ role }).eq('id', id)
    setMembers(p => p.map(m => m.id === id ? { ...m, role } : m))
  }

  const toggleActive = async (id, is_active) => {
    await supabase.from('profiles').update({ is_active }).eq('id', id)
    setMembers(p => p.map(m => m.id === id ? { ...m, is_active } : m))
  }

  const deletePending = async (id) => {
    if (!confirm('למחוק הזמנה זו?')) return
    await supabase.from('pending_staff').delete().eq('id', id)
    setPending(p => p.filter(x => x.id !== id))
  }

  const initials = name => name?.split(' ').map(w => w[0]).join('').slice(0,2) || '?'

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
        .member-row { transition: background 0.15s; }
        .member-row:hover { background: #f8fafc !important; }
        .icon-btn { transition: all 0.15s; opacity:0.5; }
        .icon-btn:hover { opacity:1; }
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px' }}>צוות</h1>
          <p style={{ color:'#94a3b8', fontSize:13, marginTop:3 }}>{members.length} חברי צוות</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setInviteLink(''); setModal(true) }}
          style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontWeight:700, padding:'10px 20px', borderRadius:12, cursor:'pointer', fontSize:14, boxShadow:'0 4px 12px rgba(99,102,241,0.25)', transition:'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
          + הזמן עובד
        </button>
      </div>

      {/* הזמנות ממתינות */}
      {pending.length > 0 && (
        <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:14, padding:20, marginBottom:20 }}>
          <div style={{ fontWeight:700, fontSize:14, color:'#92400e', marginBottom:12 }}>⏳ הזמנות ממתינות לאישור</div>
          {pending.map(p => (
            <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff', borderRadius:10, padding:'10px 14px', marginBottom:6 }}>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <div style={{ width:34, height:34, borderRadius:10, background:p.color||'#6366f1', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13 }}>
                  {initials(p.full_name)}
                </div>
                <div>
                  <div style={{ fontWeight:600, fontSize:14, color:'#1e293b' }}>{p.full_name}</div>
                  <div style={{ fontSize:12, color:'#94a3b8' }}>{p.email} · {ROLE_LABEL[p.role]}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => {
                  const link = `${window.location.origin}?invite=${encodeURIComponent(p.email)}`
                  const msg  = `שלום ${p.full_name} 👋\n\nהוזמנת להצטרף למערכת אוורסט!\n\nלחץ על הקישור להרשמה:\n${link}\n\nתודה! 🏔️`
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
                }} style={{ background:'#25d366', border:'none', color:'#fff', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                  📱 שלח שוב
                </button>
                <button className="icon-btn" onClick={() => deletePending(p.id)}
                  style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:15 }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* חברי צוות */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden' }}>
        <div style={{ padding:'14px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontWeight:700, fontSize:14, color:'#1e293b' }}>👥 חברי הצוות</span>
          <span style={{ fontSize:13, color:'#94a3b8' }}>{members.filter(m => m.is_active !== false).length} פעילים</span>
        </div>

        {members.length === 0
          ? <div style={{ padding:'60px 0', textAlign:'center', color:'#94a3b8' }}>
              <div style={{ fontSize:36, marginBottom:10 }}>👥</div>
              <div>אין עובדים עדיין</div>
            </div>
          : members.map((m, i) => (
            <div key={m.id} className="member-row"
              style={{ display:'flex', alignItems:'center', padding:'16px 24px', borderBottom: i<members.length-1 ? '1px solid #f8fafc' : 'none', opacity: m.is_active === false ? 0.5 : 1, animation:`fadeUp 0.25s ease ${i*0.05}s both` }}>
              <div style={{ width:44, height:44, borderRadius:14, background: m.color||'#6366f1', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, flexShrink:0, marginLeft:14 }}>
                {initials(m.full_name)}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontWeight:600, fontSize:15, color:'#1e293b' }}>{m.full_name}</span>
                  {m.id === currentUser?.id && (
                    <span style={{ fontSize:11, background:'#eef2ff', color:'#6366f1', padding:'2px 8px', borderRadius:20, fontWeight:600 }}>אתה</span>
                  )}
                  {m.is_active === false && (
                    <span style={{ fontSize:11, background:'#fef2f2', color:'#ef4444', padding:'2px 8px', borderRadius:20, fontWeight:600 }}>לא פעיל</span>
                  )}
                </div>
                {m.phone && <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>📞 {m.phone}</div>}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <select value={m.role} onChange={e => updateRole(m.id, e.target.value)}
                  disabled={m.id === currentUser?.id}
                  style={{ background:ROLE_BG[m.role]||'#f8fafc', color:ROLE_COLOR[m.role]||'#64748b', border:`1px solid ${(ROLE_COLOR[m.role]||'#e2e8f0')}33`, borderRadius:20, padding:'5px 12px', fontSize:12, fontWeight:600, cursor: m.id === currentUser?.id ? 'default' : 'pointer', outline:'none' }}>
                  {Object.entries(ROLE_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {m.id !== currentUser?.id && (
                  <button onClick={() => toggleActive(m.id, m.is_active === false)}
                    style={{ background: m.is_active === false ? '#ecfdf5' : '#fef2f2', border:'none', color: m.is_active === false ? '#10b981' : '#ef4444', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                    {m.is_active === false ? '✅ הפעל' : '🚫 השבת'}
                  </button>
                )}
              </div>
            </div>
          ))
        }
      </div>

      {/* הרשאות */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', padding:24, marginTop:20 }}>
        <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:700, color:'#1e293b' }}>🔐 הרשאות לפי תפקיד</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {[
            { role:'owner',   features:['גישה לכל המערכת','ניהול עובדים','דוחות פיננסיים','הגדרות מערכת'] },
            { role:'manager', features:['ניהול השכרות','ניהול לקוחות','ניהול מלאי','צפייה בדוחות'] },
            { role:'staff',   features:['צפייה בהשכרות','עדכון סטטוסים','צפייה במלאי','לוח שנה'] },
          ].map(r => (
            <div key={r.role} style={{ background:ROLE_BG[r.role], borderRadius:12, padding:16, border:`1px solid ${ROLE_COLOR[r.role]}22` }}>
              <div style={{ fontWeight:700, fontSize:14, color:ROLE_COLOR[r.role], marginBottom:10 }}>{ROLE_LABEL[r.role]}</div>
              {r.features.map((f,i) => (
                <div key={i} style={{ fontSize:12, color:'#475569', marginBottom:4, display:'flex', gap:6 }}>
                  <span style={{ color:ROLE_COLOR[r.role] }}>✓</span>{f}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'#fff', borderRadius:20, padding:32, width:420, direction:'rtl', boxShadow:'0 24px 60px rgba(0,0,0,0.15)', animation:'fadeUp 0.25s ease' }}>
            <h2 style={{ margin:'0 0 24px', fontSize:18, fontWeight:800, color:'#0f172a' }}>➕ הזמן עובד</h2>

            {!inviteLink ? (
              <>
                {[
                  { label:'שם מלא *', key:'full_name', type:'text',  placeholder:'ישראל ישראלי' },
                  { label:'אימייל *', key:'email',     type:'email', placeholder:'email@example.com' },
                  { label:'טלפון',    key:'phone',     type:'tel',   placeholder:'050-0000000' },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom:14 }}>
                    <label style={lbl}>{f.label}</label>
                    <input style={inp} type={f.type} placeholder={f.placeholder} value={form[f.key]||''}
                      onChange={e => setForm(p => ({...p,[f.key]:e.target.value}))}
                      onFocus={e => e.target.style.borderColor='#6366f1'}
                      onBlur={e => e.target.style.borderColor='#e2e8f0'} />
                  </div>
                ))}

                <div style={{ marginBottom:14 }}>
                  <label style={lbl}>תפקיד</label>
                  <select style={inp} value={form.role} onChange={e => setForm(p => ({...p,role:e.target.value}))}>
                    {Object.entries(ROLE_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom:20 }}>
                  <label style={lbl}>צבע אווטאר</label>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {COLORS.map(c => (
                      <div key={c} onClick={() => setForm(p => ({...p,color:c}))}
                        style={{ width:28, height:28, borderRadius:'50%', background:c, cursor:'pointer', border: form.color===c ? '3px solid #1e293b' : '2px solid transparent', transition:'all 0.15s', transform: form.color===c ? 'scale(1.2)' : 'scale(1)' }} />
                    ))}
                  </div>
                </div>

                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={addPending} disabled={saving}
                    style={{ flex:1, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontWeight:700, padding:'13px', borderRadius:12, cursor:'pointer', fontSize:15 }}>
                    {saving ? 'שומר...' : 'צור הזמנה'}
                  </button>
                  <button onClick={() => setModal(false)}
                    style={{ flex:1, background:'#f8fafc', border:'1px solid #e2e8f0', color:'#64748b', fontWeight:600, padding:'13px', borderRadius:12, cursor:'pointer', fontSize:15 }}>
                    ביטול
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign:'center', marginBottom:20 }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
                  <div style={{ fontWeight:700, fontSize:16, color:'#1e293b' }}>ההזמנה נוצרה!</div>
                  <div style={{ fontSize:13, color:'#94a3b8', marginTop:4 }}>שלח את הקישור ל{form.full_name}</div>
                </div>

                <div style={{ background:'#f8fafc', borderRadius:10, padding:'12px 16px', marginBottom:16, fontSize:12, color:'#475569', wordBreak:'break-all', border:'1px solid #e2e8f0' }}>
                  🔗 {inviteLink}
                </div>

                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={shareInvite}
                    style={{ flex:1, background:'#25d366', border:'none', color:'#fff', fontWeight:700, padding:'13px', borderRadius:12, cursor:'pointer', fontSize:15 }}>
                    📱 שלח ב-WhatsApp
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(inviteLink); alert('✅ הועתק!') }}
                    style={{ flex:1, background:'#eef2ff', border:'none', color:'#6366f1', fontWeight:600, padding:'13px', borderRadius:12, cursor:'pointer', fontSize:15 }}>
                    🔗 העתק
                  </button>
                </div>
                <button onClick={() => setModal(false)}
                  style={{ width:'100%', background:'transparent', border:'none', color:'#94a3b8', padding:'12px', cursor:'pointer', fontSize:14, marginTop:8 }}>
                  סגור
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const lbl = { display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:5 }
const inp = { width:'100%', background:'#f8fafc', border:'1px solid #e2e8f0', color:'#1e293b', borderRadius:10, padding:'10px 12px', fontSize:14, outline:'none', boxSizing:'border-box', transition:'border-color 0.2s' }