import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [focused, setFocused]   = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('אימייל או סיסמה שגויים')
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg, #f8f9fb 0%, #eef2ff 100%)', display:'flex', alignItems:'center', justifyContent:'center', direction:'rtl', fontFamily:'"Inter","Segoe UI",sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        .login-input { transition: border-color 0.2s, box-shadow 0.2s; }
        .login-input:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .login-btn { transition: all 0.2s; }
        .login-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,0.35); }
        .login-btn:active { transform: translateY(0); }
      `}</style>

      {/* Background decoration */}
      <div style={{ position:'fixed', top:-100, left:-100, width:400, height:400, borderRadius:'50%', background:'rgba(99,102,241,0.06)', pointerEvents:'none' }} />
      <div style={{ position:'fixed', bottom:-80, right:-80, width:300, height:300, borderRadius:'50%', background:'rgba(139,92,246,0.06)', pointerEvents:'none' }} />

      <div style={{ animation:'fadeUp 0.4s ease', background:'#fff', borderRadius:24, padding:'40px 44px', width:'100%', maxWidth:400, boxShadow:'0 20px 60px rgba(0,0,0,0.08)', border:'1px solid #f1f5f9' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:64, height:64, borderRadius:20, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 14px', boxShadow:'0 8px 20px rgba(99,102,241,0.25)' }}>
            🏔️
          </div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px' }}>אוורסט</h1>
          <p style={{ fontSize:13, color:'#94a3b8', marginTop:4 }}>השכרת ציוד אירועים</p>
        </div>

        {/* Fields */}
        <div style={{ marginBottom:14 }}>
          <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>אימייל</label>
          <input
            className="login-input"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:`1px solid ${focused==='email' ? '#6366f1' : '#e2e8f0'}`, fontSize:14, color:'#1e293b', background:'#f8fafc' }}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused('')}
          />
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>סיסמה</label>
          <input
            className="login-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:`1px solid ${focused==='pass' ? '#6366f1' : '#e2e8f0'}`, fontSize:14, color:'#1e293b', background:'#f8fafc' }}
            onFocus={() => setFocused('pass')}
            onBlur={() => setFocused('')}
          />
        </div>

        {error && (
          <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#ef4444', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
            ⚠️ {error}
          </div>
        )}

        <button
          className="login-btn"
          onClick={handleLogin}
          disabled={loading}
          style={{ width:'100%', padding:'12px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontWeight:700, fontSize:15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.8 : 1, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          {loading
            ? <><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} /> מתחבר...</>
            : '🔐 כניסה למערכת'
          }
        </button>
      </div>
    </div>
  )
}