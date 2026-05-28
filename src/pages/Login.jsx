import { useState } from 'react'
import { supabase } from '../supabaseClient'

const T = {
  bg:'#0d0d0d', surface:'#161616', card:'#1a1a1a', border:'#2a2a2a',
  red:'#e53935', redDark:'#b71c1c', redGlow:'rgba(229,57,53,0.18)',
  text:'#f0f0f0', muted:'#888',
  neo:'inset 2px 2px 5px rgba(0,0,0,0.6), inset -2px -2px 5px rgba(255,255,255,0.04)',
  neoOut:'4px 4px 10px rgba(0,0,0,0.6), -2px -2px 6px rgba(255,255,255,0.03)',
}

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [focused, setFocused]   = useState('')

  const handleLogin = async () => {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('אימייל או סיסמה שגויים')
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', background:T.bg, display:'flex', alignItems:'center', justifyContent:'center', direction:'rtl', fontFamily:'"Inter","Segoe UI",sans-serif', position:'relative', overflow:'hidden' }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.05)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 40px rgba(229,57,53,0.2)} 50%{box-shadow:0 0 80px rgba(229,57,53,0.4)} }
      `}</style>

      {/* רקע דקורטיבי */}
      <div style={{ position:'absolute', top:-200, right:-200, width:600, height:600, borderRadius:'50%', background:`radial-gradient(circle, ${T.redGlow} 0%, transparent 70%)`, animation:'pulse 4s ease-in-out infinite', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:-150, left:-150, width:400, height:400, borderRadius:'50%', background:`radial-gradient(circle, rgba(229,57,53,0.08) 0%, transparent 70%)`, animation:'pulse 5s ease-in-out infinite 1s', pointerEvents:'none' }} />

      {/* קווי רשת */}
      <div style={{ position:'absolute', inset:0, backgroundImage:`linear-gradient(${T.border} 1px, transparent 1px), linear-gradient(90deg, ${T.border} 1px, transparent 1px)`, backgroundSize:'60px 60px', opacity:0.3, pointerEvents:'none' }} />

      <div style={{ animation:'fadeUp 0.5s ease', background:T.surface, borderRadius:24, padding:'44px 48px', width:'100%', maxWidth:420, boxShadow:`${T.neoOut}, 0 0 60px rgba(229,57,53,0.1)`, border:`1px solid ${T.border}`, position:'relative', zIndex:1 }}>

        {/* לוגו */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ width:72, height:72, borderRadius:20, background:`linear-gradient(135deg,${T.red},${T.redDark})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto 16px', boxShadow:`0 8px 32px rgba(229,57,53,0.5), inset 0 1px 0 rgba(255,255,255,0.1)`, animation:'glow 3s ease-in-out infinite' }}>
            🏔️
          </div>
          <h1 style={{ fontSize:24, fontWeight:900, color:T.text, letterSpacing:2, textTransform:'uppercase' }}>אוורסט</h1>
          <p style={{ fontSize:11, color:T.muted, marginTop:4, letterSpacing:3, textTransform:'uppercase' }}>Event Rental System</p>
        </div>

        {/* שדה אימייל */}
        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:T.muted, marginBottom:8, letterSpacing:2, textTransform:'uppercase' }}>אימייל</label>
          <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)}
            onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
            style={{ width:'100%', padding:'13px 16px', borderRadius:12, border:`1px solid ${focused==='email' ? T.red : T.border}`, fontSize:14, color:T.text, background:T.card, outline:'none', boxSizing:'border-box', boxShadow: focused==='email' ? `inset 2px 2px 5px rgba(0,0,0,0.6), 0 0 0 3px ${T.redGlow}` : 'inset 2px 2px 5px rgba(0,0,0,0.6)', transition:'all 0.2s' }} />
        </div>

        {/* שדה סיסמה */}
        <div style={{ marginBottom:24 }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:T.muted, marginBottom:8, letterSpacing:2, textTransform:'uppercase' }}>סיסמה</label>
          <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key==='Enter' && handleLogin()}
            onFocus={() => setFocused('pass')} onBlur={() => setFocused('')}
            style={{ width:'100%', padding:'13px 16px', borderRadius:12, border:`1px solid ${focused==='pass' ? T.red : T.border}`, fontSize:14, color:T.text, background:T.card, outline:'none', boxSizing:'border-box', boxShadow: focused==='pass' ? `inset 2px 2px 5px rgba(0,0,0,0.6), 0 0 0 3px ${T.redGlow}` : 'inset 2px 2px 5px rgba(0,0,0,0.6)', transition:'all 0.2s' }} />
        </div>

        {error && (
          <div style={{ background:'rgba(229,57,53,0.1)', border:`1px solid rgba(229,57,53,0.3)`, borderRadius:10, padding:'10px 14px', fontSize:13, color:T.red, marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
            ⚠️ {error}
          </div>
        )}

        <button onClick={handleLogin} disabled={loading}
          style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background:`linear-gradient(135deg,${T.red},${T.redDark})`, color:'#fff', fontWeight:800, fontSize:15, cursor:loading?'not-allowed':'pointer', letterSpacing:1, textTransform:'uppercase', transition:'all 0.2s', boxShadow:`0 4px 20px rgba(229,57,53,0.4), inset 0 1px 0 rgba(255,255,255,0.1)`, display:'flex', alignItems:'center', justifyContent:'center', gap:10, opacity:loading?0.8:1 }}>
          {loading
            ? <><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />מתחבר...</>
            : <>🔐 כניסה למערכת</>
          }
        </button>

        <div style={{ textAlign:'center', marginTop:20, fontSize:11, color:T.muted, letterSpacing:1 }}>
          POWERED BY EVEREST © 2025
        </div>
      </div>
    </div>
  )
}