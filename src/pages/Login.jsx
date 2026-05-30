import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const SUPA_URL = 'https://jeaizwuqxclvayfdbtcn.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplYWl6d3VxeGNsdmF5ZmRidGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTE3ODYsImV4cCI6MjA5NTM4Nzc4Nn0.Vtpq8pZ5o1SgIaaKVTtTRUgsu3hyIRQHYUccT8rl35c'

const T = {
  bg:'#0d0d0d', surface:'#161616', card:'#1a1a1a', border:'#2a2a2a',
  red:'#e53935', redDark:'#b71c1c', redGlow:'rgba(229,57,53,0.18)',
  text:'#f0f0f0', muted:'#888',
  neo:'inset 2px 2px 5px rgba(0,0,0,0.6), inset -2px -2px 5px rgba(255,255,255,0.04)',
  neoOut:'4px 4px 10px rgba(0,0,0,0.6), -2px -2px 6px rgba(255,255,255,0.03)',
}

const fieldStyle = (focused, name) => ({
  width:'100%', padding:'13px 16px', borderRadius:12,
  border:`1px solid ${focused===name ? T.red : T.border}`,
  fontSize:14, color:T.text, background:T.card, outline:'none', boxSizing:'border-box',
  boxShadow: focused===name ? `inset 2px 2px 5px rgba(0,0,0,0.6), 0 0 0 3px ${T.redGlow}` : 'inset 2px 2px 5px rgba(0,0,0,0.6)',
  transition:'all 0.2s'
})
const labelStyle = { display:'block', fontSize:11, fontWeight:700, color:T.muted, marginBottom:8, letterSpacing:2, textTransform:'uppercase' }

export default function Login() {
  const [mode, setMode]         = useState('login') // 'login' | 'signup'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [focused, setFocused]   = useState('')

  // אם יש ?invite=email ב-URL — עוברים אוטומטית למצב הרשמה וממלאים את המייל
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const invite = params.get('invite')
    if (invite) {
      setMode('signup')
      setEmail(invite)
    }
  }, [])

  const handleLogin = async () => {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('אימייל או סיסמה שגויים')
    setLoading(false)
  }

  const handleSignup = async () => {
    if (!email || !password || !fullName) { setError('נא למלא את כל השדות'); return }
    if (password.length < 6) { setError('הסיסמה חייבת להכיל לפחות 6 תווים'); return }
    setLoading(true); setError(''); setSuccess('')

    // 1. יוצרים משתמש
    const { data, error: signErr } = await supabase.auth.signUp({ email, password })
    if (signErr) {
      setError(signErr.message.includes('already') ? 'משתמש עם אימייל זה כבר קיים' : 'שגיאה בהרשמה: ' + signErr.message)
      setLoading(false); return
    }

    const userId = data.user?.id
    if (!userId) { setError('שגיאה ביצירת המשתמש'); setLoading(false); return }

    // 2. בודקים אם יש הזמנה ממתינה עם פרטי תפקיד/צבע שהבעלים הגדיר
    let role = 'staff', color = '#6366f1', phone = null
    try {
      const res = await fetch(`${SUPA_URL}/rest/v1/pending_staff?select=*&email=eq.${encodeURIComponent(email)}&used=eq.false`, {
        headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY }
      })
      const pend = await res.json()
      if (Array.isArray(pend) && pend[0]) {
        role  = pend[0].role  || 'staff'
        color = pend[0].color || '#6366f1'
        phone = pend[0].phone || null
      }
    } catch (e) { console.error('pending lookup error:', e) }

    // 3. יוצרים פרופיל עם התפקיד שהבעלים הגדיר (ברירת מחדל: עובד)
    const headers = {
      apikey: SUPA_KEY,
      Authorization: 'Bearer ' + (data.session?.access_token || SUPA_KEY),
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    }
    try {
      await fetch(`${SUPA_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: userId, full_name: fullName, role, color, phone, is_active: true })
      })
      // מסמנים את ההזמנה כנוצלה
      await fetch(`${SUPA_URL}/rest/v1/pending_staff?email=eq.${encodeURIComponent(email)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ used: true })
      })
    } catch (e) { console.error('profile create error:', e) }

    setLoading(false)

    // אם נוצר session — המשתמש מחובר ויעבור אוטומטית למערכת
    if (data.session) {
      window.location.href = window.location.origin
    } else {
      // אם Supabase דורש אימות מייל — מציגים הודעה
      setSuccess('נרשמת בהצלחה! אם נדרש אימות מייל, בדוק את תיבת הדואר. אחרת — התחבר עכשיו.')
      setMode('login')
      setPassword('')
    }
  }

  const submit = () => mode === 'login' ? handleLogin() : handleSignup()

  return (
    <div style={{ minHeight:'100vh', background:T.bg, display:'flex', alignItems:'center', justifyContent:'center', direction:'rtl', fontFamily:'"Inter","Segoe UI",sans-serif', position:'relative', overflow:'hidden' }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.05)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 40px rgba(229,57,53,0.2)} 50%{box-shadow:0 0 80px rgba(229,57,53,0.4)} }
      `}</style>

      <div style={{ position:'absolute', top:-200, right:-200, width:600, height:600, borderRadius:'50%', background:`radial-gradient(circle, ${T.redGlow} 0%, transparent 70%)`, animation:'pulse 4s ease-in-out infinite', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:-150, left:-150, width:400, height:400, borderRadius:'50%', background:`radial-gradient(circle, rgba(229,57,53,0.08) 0%, transparent 70%)`, animation:'pulse 5s ease-in-out infinite 1s', pointerEvents:'none' }} />
      <div style={{ position:'absolute', inset:0, backgroundImage:`linear-gradient(${T.border} 1px, transparent 1px), linear-gradient(90deg, ${T.border} 1px, transparent 1px)`, backgroundSize:'60px 60px', opacity:0.3, pointerEvents:'none' }} />

      <div style={{ animation:'fadeUp 0.5s ease', background:T.surface, borderRadius:24, padding:'44px 48px', width:'100%', maxWidth:420, boxShadow:`${T.neoOut}, 0 0 60px rgba(229,57,53,0.1)`, border:`1px solid ${T.border}`, position:'relative', zIndex:1 }}>

        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ width:72, height:72, borderRadius:20, background:`linear-gradient(135deg,${T.red},${T.redDark})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto 16px', boxShadow:`0 8px 32px rgba(229,57,53,0.5), inset 0 1px 0 rgba(255,255,255,0.1)`, animation:'glow 3s ease-in-out infinite' }}>
            🏔️
          </div>
          <h1 style={{ fontSize:24, fontWeight:900, color:T.text, letterSpacing:2, textTransform:'uppercase' }}>אוורסט</h1>
          <p style={{ fontSize:11, color:T.muted, marginTop:4, letterSpacing:3, textTransform:'uppercase' }}>
            {mode === 'login' ? 'Event Rental System' : 'הרשמת עובד חדש'}
          </p>
        </div>

        {/* שם מלא — רק בהרשמה */}
        {mode === 'signup' && (
          <div style={{ marginBottom:16 }}>
            <label style={labelStyle}>שם מלא</label>
            <input type="text" placeholder="ישראל ישראלי" value={fullName} onChange={e => setFullName(e.target.value)}
              onFocus={() => setFocused('name')} onBlur={() => setFocused('')}
              style={fieldStyle(focused, 'name')} />
          </div>
        )}

        {/* אימייל */}
        <div style={{ marginBottom:16 }}>
          <label style={labelStyle}>אימייל</label>
          <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)}
            onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
            style={fieldStyle(focused, 'email')} />
        </div>

        {/* סיסמה */}
        <div style={{ marginBottom:24 }}>
          <label style={labelStyle}>סיסמה</label>
          <input type="password" placeholder={mode === 'signup' ? 'לפחות 6 תווים' : '••••••••'} value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            onFocus={() => setFocused('pass')} onBlur={() => setFocused('')}
            style={fieldStyle(focused, 'pass')} />
        </div>

        {error && (
          <div style={{ background:'rgba(229,57,53,0.1)', border:`1px solid rgba(229,57,53,0.3)`, borderRadius:10, padding:'10px 14px', fontSize:13, color:T.red, marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div style={{ background:'rgba(16,185,129,0.1)', border:`1px solid rgba(16,185,129,0.3)`, borderRadius:10, padding:'10px 14px', fontSize:13, color:'#10b981', marginBottom:16 }}>
            ✅ {success}
          </div>
        )}

        <button onClick={submit} disabled={loading}
          style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background:`linear-gradient(135deg,${T.red},${T.redDark})`, color:'#fff', fontWeight:800, fontSize:15, cursor:loading?'not-allowed':'pointer', letterSpacing:1, textTransform:'uppercase', transition:'all 0.2s', boxShadow:`0 4px 20px rgba(229,57,53,0.4), inset 0 1px 0 rgba(255,255,255,0.1)`, display:'flex', alignItems:'center', justifyContent:'center', gap:10, opacity:loading?0.8:1 }}>
          {loading
            ? <><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />{mode === 'login' ? 'מתחבר...' : 'נרשם...'}</>
            : mode === 'login' ? <>🔐 כניסה למערכת</> : <>✨ הרשמה</>
          }
        </button>

        {/* מעבר בין מצבים */}
        <div style={{ textAlign:'center', marginTop:20 }}>
          {mode === 'login' ? (
            <button onClick={() => { setMode('signup'); setError(''); setSuccess('') }}
              style={{ background:'transparent', border:'none', color:T.muted, fontSize:13, cursor:'pointer' }}>
              עובד חדש? <span style={{ color:T.red, fontWeight:700 }}>הירשם כאן</span>
            </button>
          ) : (
            <button onClick={() => { setMode('login'); setError(''); setSuccess('') }}
              style={{ background:'transparent', border:'none', color:T.muted, fontSize:13, cursor:'pointer' }}>
              כבר יש לך חשבון? <span style={{ color:T.red, fontWeight:700 }}>התחבר</span>
            </button>
          )}
        </div>

        <div style={{ textAlign:'center', marginTop:16, fontSize:11, color:T.muted, letterSpacing:1 }}>
          POWERED BY EVEREST © 2025
        </div>
      </div>
    </div>
  )
}