import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const ROLE_LABEL = { owner:'בעלים', manager:'מנהל', staff:'עובד' }
const ROLE_COLOR = { owner:'#6366f1', manager:'#f59e0b', staff:'#10b981' }
const ROLE_BG    = { owner:'#eef2ff', manager:'#fffbeb', staff:'#ecfdf5' }
const COLORS     = ['#6366f1','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6','#3b82f6']

const EMPTY_INVITE = { email:'', full_name:'', role:'staff', color:'#6366f1' }

export default function Team() {
  const [members, setMembers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState(EMPTY_INVITE)
  const [saving, setSaving]     = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at')
    setMembers(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const invite = async () => {
    if (!form.email || !form.full_name) return alert('נא למלא אימייל ושם')
    setSaving(true)
    // שליחת הזמנה דרך Supabase Auth
    const { error } = await supabase.auth.admin?.inviteUserByEmail
      ? supabase.auth.admin.inviteUserByEmail(form.email)
      : { error: null }

    // יצירת פרופיל ידני (המשתמש יוזמן בנפרד)
    const { error: profileError } = await supabase.from('profiles').upsert({
      id:        crypto.randomUUID(),
      full_name: form.full_name,
      role:      form.role,
      color:     form.color,
      phone:     form.phone || null,
    })

    if (profileError) alert('שגיאה: ' + profileError.message)
    else {
      alert(`✅ פרופיל נוצר!\n\nכדי להזמין את ${form.full_name} — שלח לו/ה את קישור ההרשמה:\n${window.location.origin}`)
    }

    await load()
    setModal(false)
    setForm(EMPTY_INVITE)
    setSaving(false)
  }

  const updateRole = async (id, role) => {
    await supabase.from('profiles').update({ role }).eq('id', id)
    setMembers(p => p.map(m => m.id === id ? { ...m, role } : m))
  }

  const toggleActive = async (id, is_active) => {
    await supabase.from('profiles').update({ is_active }).eq('id', id)
    setMembers(p => p.map(m => m.id === id ? { ...m, is_active } : m))
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
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px' }}>צוות</h1>
          <p style={{ color:'#94a3b8', fontSize:13, marginTop:3 }}>{members.length} חברי צוות</p>
        </div>
        <button onClick={() => { setForm(EMPTY_INVITE); setModal(true) }}
          style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontWeight:700, padding:'10px 20px', borderRadius:12, cursor:'pointer', fontSize:14, boxShadow:'0 4px 12px rgba(99,102,241,0.25)', transition:'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
          + הוסף עובד
        </button>
      </div>

      {/* רשימת חברי צוות */}
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

              {/* אווטאר */}
              <div style={{ width:44, height:44, borderRadius:14, background: m.color || '#6366f1', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, flexShrink:0, marginLeft:14 }}>
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
                {/* תפקיד */}
                <select value={m.role} onChange={e => updateRole(m.id, e.target.value)}
                  disabled={m.id === currentUser?.id}
                  style={{ background:ROLE_BG[m.role], color:ROLE_COLOR[m.role], border:`1px solid ${ROLE_COLOR[m.role]}33`, borderRadius:20, padding:'5px 12px', fontSize:12, fontWeight:600, cursor: m.id === currentUser?.id ? 'default' : 'pointer', outline:'none' }}>
                  {Object.entries(ROLE_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>

                {/* הפעל/השבת */}
                {m.id !== currentUser?.id && (
                  <button onClick={() => toggleActive(m.id, m.is_active === false)}
                    style={{ background: m.is_active === false ? '#ecfdf5' : '#fef2f2', border:'none', color: m.is_active === false ? '#10b981' : '#ef4444', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12, fontWeight:600, transition:'all 0.15s' }}>
                    {m.is_active === false ? '✅ הפעל' : '🚫 השבת'}
                  </button>
                )}
              </div>
            </div>
          ))
        }
      </div>

      {/* הסבר הרשאות */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', padding:24, marginTop:20 }}>
        <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:700, color:'#1e293b' }}>🔐 הרשאות לפי תפקיד</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {[
            { role:'owner', features:['גישה לכל המערכת', 'ניהול עובדים', 'דוחות פיננסיים', 'הגדרות מערכת'] },
            { role:'manager', features:['ניהול השכרות', 'ניהול לקוחות', 'ניהול מלאי', 'צפייה בדוחות'] },
            { role:'staff', features:['צפייה בהשכרות', 'עדכון סטטוסים', 'צפייה במלאי', 'לוח שנה'] },
          ].map(r => (
            <div key={r.role} style={{ background:ROLE_BG[r.role], borderRadius:12, padding:16, border:`1px solid ${ROLE_COLOR[r.role]}22` }}>
              <div style={{ fontWeight:700, fontSize:14, color:ROLE_COLOR[r.role], marginBottom:10 }}>
                {ROLE_LABEL[r.role]}
              </div>
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
            <h2 style={{ margin:'0 0 24px', fontSize:18, fontWeight:800, color:'#0f172a' }}>➕ הוסף עובד</h2>

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

            {/* תצוגה מקדימה */}
            <div style={{ display:'flex', alignItems:'center', gap:12, background:'#f8fafc', borderRadius:10, padding:'12px 16px', marginBottom:20 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:form.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:16 }}>
                {initials(form.full_name || 'עובד')}
              </div>
              <div>
                <div style={{ fontWeight:600, fontSize:14, color:'#1e293b' }}>{form.full_name || 'שם העובד'}</div>
                <div style={{ fontSize:12, color:ROLE_COLOR[form.role] }}>{ROLE_LABEL[form.role]}</div>
              </div>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={invite} disabled={saving}
                style={{ flex:1, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontWeight:700, padding:'13px', borderRadius:12, cursor:'pointer', fontSize:15 }}>
                {saving ? 'שומר...' : 'הוסף עובד'}
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