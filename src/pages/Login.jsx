import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('אימייל או סיסמה שגויים')
    setLoading(false)
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>🎪 EventStock</div>
        <div style={s.sub}>מערכת ניהול השכרות</div>

        <input
          style={s.input}
          type="email"
          placeholder="אימייל"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          style={s.input}
          type="password"
          placeholder="סיסמה"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />

        {error && <div style={s.error}>{error}</div>}

        <button style={s.btn} onClick={handleLogin} disabled={loading}>
          {loading ? '⏳ מתחבר...' : '🔐 כניסה'}
        </button>
      </div>
    </div>
  )
}

const s = {
  page:  { display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0a0f1a', direction:'rtl' },
  card:  { background:'#111827', border:'1px solid #1e2d40', borderRadius:16, padding:40, width:340, display:'flex', flexDirection:'column', gap:14 },
  logo:  { fontSize:26, fontWeight:800, color:'#f8b942', textAlign:'center' },
  sub:   { fontSize:13, color:'#4a6080', textAlign:'center', marginBottom:8 },
  input: { background:'#0a0f1a', border:'1px solid #1e2d40', borderRadius:8, padding:'12px 14px', color:'#e8edf5', fontSize:14, outline:'none' },
  error: { color:'#ef4444', fontSize:13, textAlign:'center' },
  btn:   { background:'linear-gradient(135deg,#f8b942,#f57c00)', border:'none', borderRadius:10, padding:'13px', color:'#0a0f1a', fontWeight:700, fontSize:15, cursor:'pointer' },
}