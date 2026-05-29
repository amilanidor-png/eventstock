import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Rentals from './pages/Rentals'
import Customers from './pages/Customers'
import Business from './pages/Business'
import Calendar from './pages/Calendar'
import Settings from './pages/Settings'
import Payments from './pages/Payments'
import Team from './pages/Team'
import ContractManager from './pages/ContractManager'
import Contract from './pages/Contract'
import Login from './pages/Login'
import GlobalSearch from './GlobalSearch'

const ALL_NAV = [
  { path: '/',           label: 'עסק',     icon: '💼', roles: ['owner','manager'] },
  { path: '/dashboard',  label: 'בקרה',    icon: '📊', roles: ['owner','manager','staff'] },
  { path: '/inventory',  label: 'מלאי',    icon: '📦', roles: ['owner','manager','staff'] },
  { path: '/rentals',    label: 'השכרות',  icon: '📋', roles: ['owner','manager','staff'] },
  { path: '/payments',   label: 'תשלומים', icon: '💳', roles: ['owner','manager'] },
  { path: '/customers',  label: 'לקוחות',  icon: '👤', roles: ['owner','manager','staff'] },
  { path: '/contracts',  label: 'חוזים',   icon: '📄', roles: ['owner','manager'] },
  { path: '/calendar',   label: 'לוח שנה', icon: '📅', roles: ['owner','manager','staff'] },
  { path: '/team',       label: 'צוות',    icon: '👥', roles: ['owner','manager'] },
  { path: '/settings',   label: 'הגדרות',  icon: '⚙️', roles: ['owner','manager'] },
]

const T = {
  bg:'#0d0d0d', surface:'#161616', card:'#1a1a1a', border:'#2a2a2a',
  red:'#e53935', redDark:'#b71c1c', redGlow:'rgba(229,57,53,0.18)',
  text:'#f0f0f0', muted:'#888',
}

const MOBILE_MAIN = ['/dashboard', '/rentals', '/inventory', '/customers']

function MobileNav({ nav }) {
  const [showMore, setShowMore] = useState(false)
  const mainItems = nav.filter(n => MOBILE_MAIN.includes(n.path))
  const moreItems = nav.filter(n => !MOBILE_MAIN.includes(n.path))

  return (
    <>
      {showMore && (
        <div style={{ position:'fixed', bottom:65, right:0, left:0, background:T.surface, borderTop:`1px solid ${T.border}`, zIndex:99, boxShadow:'0 -8px 32px rgba(0,0,0,0.8)', direction:'rtl' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', padding:'12px 8px' }}>
            {moreItems.map(n => (
              <NavLink key={n.path} to={n.path} end={n.path === '/'}
                onClick={() => setShowMore(false)}
                style={({ isActive }) => ({
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                  color: isActive ? T.red : T.muted,
                  textDecoration:'none', fontSize:11, fontWeight: isActive ? 700 : 400,
                  padding:'10px 4px', borderRadius:10,
                  background: isActive ? T.redGlow : 'transparent',
                })}>
                <span style={{ fontSize:22 }}>{n.icon}</span>
                {n.label}
              </NavLink>
            ))}
            <button onClick={() => { supabase.auth.signOut(); setShowMore(false) }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, background:'transparent', border:'none', color:T.muted, fontSize:11, cursor:'pointer', padding:'10px 4px' }}>
              <span style={{ fontSize:22 }}>🚪</span>יציאה
            </button>
          </div>
        </div>
      )}
      {showMore && <div style={{ position:'fixed', inset:0, zIndex:98 }} onClick={() => setShowMore(false)} />}

      <nav style={{ position:'fixed', bottom:0, right:0, left:0, background:T.surface, borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'space-around', padding:'6px 0 10px', zIndex:100, boxShadow:'0 -4px 24px rgba(0,0,0,0.8)' }}>
        {mainItems.map(n => (
          <NavLink key={n.path} to={n.path} end={n.path === '/'}
            style={({ isActive }) => ({
              display:'flex', flexDirection:'column', alignItems:'center', gap:2,
              color: isActive ? T.red : T.muted,
              textDecoration:'none', fontSize:10, fontWeight: isActive ? 700 : 400,
              padding:'4px 12px', borderRadius:8, transition:'all 0.2s'
            })}>
            <span style={{ fontSize:20 }}>{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
        {moreItems.length > 0 && (
          <button onClick={() => setShowMore(p => !p)}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, background:'transparent', border:'none',
              color: showMore ? T.red : T.muted, fontSize:10, cursor:'pointer', padding:'4px 12px', fontWeight: showMore ? 700 : 400 }}>
            <span style={{ fontSize:20 }}>{showMore ? '✕' : '⋯'}</span>
            עוד
          </button>
        )}
      </nav>
    </>
  )
}

function ProtectedRoute({ children, allowedRoles, userRole }) {
  if (!allowedRoles.includes(userRole)) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh', color:T.muted, direction:'rtl' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
      <div style={{ fontSize:18, fontWeight:700, color:T.text }}>אין לך הרשאה לצפות בדף זה</div>
    </div>
  )
  return children
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mobile, setMobile]   = useState(window.innerWidth < 768)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const fetchProfile = async (userId, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const { data: prof, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        if (!error && prof) {
          setProfile(prof)
          return
        }
      } catch (err) {
        console.error('Profile fetch attempt', i + 1, 'failed:', err)
      }
      await new Promise(r => setTimeout(r, 500))
    }
  }

  useEffect(() => {
    let done = false

    // אם הטעינה נתקעת יותר מ-8 שניות — מנקים session תקוע ומתחילים מחדש
    const stuckTimer = setTimeout(async () => {
      if (!done) {
        console.warn('Session stuck - clearing and reloading')
        try { await supabase.auth.signOut() } catch (e) { /* ignore */ }
        // ניקוי ידני של ה-token מ-localStorage למקרה ש-signOut נתקע
        Object.keys(localStorage)
          .filter(k => k.startsWith('sb-'))
          .forEach(k => localStorage.removeItem(k))
        window.location.reload()
      }
    }, 8000)

    supabase.auth.getSession()
      .then(async ({ data }) => {
        setSession(data.session)
        if (data.session) await fetchProfile(data.session.user.id)
      })
      .catch(console.error)
      .finally(() => {
        done = true
        clearTimeout(stuckTimer)
        setLoading(false)
      })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s)
      if (s) await fetchProfile(s.user.id)
      else setProfile(null)
    })

    return () => {
      clearTimeout(stuckTimer)
      listener.subscription.unsubscribe()
    }
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:T.bg }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
        <div style={{ width:48, height:48, border:`3px solid ${T.border}`, borderTop:`3px solid ${T.red}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <span style={{ color:T.muted, fontSize:14, letterSpacing:2 }}>LOADING...</span>
      </div>
    </div>
  )

  if (window.location.pathname.startsWith('/contract/')) return (
    <BrowserRouter>
      <Routes>
        <Route path="/contract/:id" element={<Contract />} />
      </Routes>
    </BrowserRouter>
  )

  if (!session) return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )

  const userRole = profile?.role || 'staff'
  const nav      = ALL_NAV.filter(n => n.roles.includes(userRole))

  return (
    <BrowserRouter>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; color: ${T.text}; }
        ::selection { background: ${T.red}; color: #fff; }
        .nav-link { transition: all 0.25s ease; position: relative; overflow: hidden; }
        .nav-link::before { content:''; position:absolute; inset:0; background: linear-gradient(135deg, ${T.red}, ${T.redDark}); opacity:0; transition: opacity 0.25s; border-radius:10px; }
        .nav-link:hover::before { opacity:0.12; }
        .neo-btn { background: linear-gradient(135deg, ${T.red}, ${T.redDark}); border:none; color:#fff; font-weight:700; border-radius:12px; cursor:pointer; transition:all 0.2s; box-shadow: 0 4px 15px rgba(229,57,53,0.4), inset 0 1px 0 rgba(255,255,255,0.1); }
        .neo-btn:hover { transform:translateY(-2px); box-shadow: 0 8px 25px rgba(229,57,53,0.5); }
        .neo-btn:active { transform:translateY(0); }
        .fade-in { animation: fadeIn 0.35s ease; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:${T.bg}; }
        ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:10px; }
        ::-webkit-scrollbar-thumb:hover { background:${T.red}; }
        .chip-btn { transition:all 0.15s; cursor:pointer; }
        .chip-btn:hover { border-color:${T.red} !important; color:${T.red} !important; }
        .icon-btn { transition:all 0.15s; opacity:0.4; background:transparent; border:none; cursor:pointer; }
        .icon-btn:hover { opacity:1; transform:scale(1.15); }
      `}</style>

      <div style={{ display:'flex', flexDirection: mobile ? 'column' : 'row', minHeight:'100vh', background:T.bg, fontFamily:'"Inter","Segoe UI",sans-serif', direction:'rtl' }}>

        {mobile ? <MobileNav nav={nav} /> : (
          <aside style={{ width:240, background:T.surface, borderLeft:`1px solid ${T.border}`, display:'flex', flexDirection:'column', padding:'24px 16px', boxShadow:`4px 0 24px rgba(0,0,0,0.6)`, position:'sticky', top:0, height:'100vh' }}>
            <div style={{ padding:'8px 12px 24px', borderBottom:`1px solid ${T.border}`, marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg,${T.red},${T.redDark})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, boxShadow:`0 4px 12px rgba(229,57,53,0.4)` }}>
                  🏔️
                </div>
                <div>
                  <div style={{ fontSize:16, fontWeight:900, color:T.text, letterSpacing:1 }}>אוורסט</div>
                  <div style={{ fontSize:10, color:T.muted, letterSpacing:2, textTransform:'uppercase' }}>Event Rental</div>
                </div>
              </div>
              <div style={{ marginTop:10, fontSize:11, color:T.muted }}>
                {profile?.full_name} · <span style={{ color:T.red }}>{userRole === 'owner' ? 'בעלים' : userRole === 'manager' ? 'מנהל' : 'עובד'}</span>
              </div>
            </div>

            <GlobalSearch />

            <nav style={{ display:'flex', flexDirection:'column', gap:3, flex:1, overflowY:'auto' }}>
              {nav.map(n => (
                <NavLink key={n.path} to={n.path} end={n.path === '/'}
                  className="nav-link"
                  style={({ isActive }) => ({
                    display:'flex', alignItems:'center', gap:12, padding:'11px 14px',
                    borderRadius:10, textDecoration:'none', fontSize:13, position:'relative', zIndex:1,
                    color: isActive ? '#fff' : T.muted,
                    fontWeight: isActive ? 700 : 400,
                    background: isActive ? `linear-gradient(135deg,${T.red},${T.redDark})` : 'transparent',
                    boxShadow: isActive ? `0 4px 12px rgba(229,57,53,0.3)` : 'none',
                  })}>
                  <span style={{ fontSize:16 }}>{n.icon}</span>
                  {n.label}
                </NavLink>
              ))}
            </nav>

            <button
              style={{ background:'transparent', border:`1px solid ${T.border}`, color:T.muted, padding:'10px', borderRadius:10, cursor:'pointer', fontSize:13, transition:'all 0.2s', marginTop:12 }}
              onMouseEnter={e => { e.target.style.borderColor=T.red; e.target.style.color=T.red }}
              onMouseLeave={e => { e.target.style.borderColor=T.border; e.target.style.color=T.muted }}
              onClick={() => supabase.auth.signOut()}>
              🚪 התנתק
            </button>
          </aside>
        )}

        <main style={{ flex:1, overflowY:'auto', padding: mobile ? '20px 16px 80px' : '32px 36px' }}>
          <div className="fade-in">
            <Routes>
              <Route path="/" element={<ProtectedRoute allowedRoles={['owner','manager']} userRole={userRole}><Business /></ProtectedRoute>} />
              <Route path="/dashboard"    element={<Dashboard />} />
              <Route path="/inventory"    element={<Inventory />} />
              <Route path="/rentals"      element={<Rentals />} />
              <Route path="/payments"     element={<ProtectedRoute allowedRoles={['owner','manager']} userRole={userRole}><Payments /></ProtectedRoute>} />
              <Route path="/customers"    element={<Customers />} />
              <Route path="/contracts"    element={<ProtectedRoute allowedRoles={['owner','manager']} userRole={userRole}><ContractManager /></ProtectedRoute>} />
              <Route path="/contract/:id" element={<Contract />} />
              <Route path="/calendar"     element={<Calendar />} />
              <Route path="/team"         element={<ProtectedRoute allowedRoles={['owner','manager']} userRole={userRole}><Team /></ProtectedRoute>} />
              <Route path="/settings"     element={<ProtectedRoute allowedRoles={['owner','manager']} userRole={userRole}><Settings /></ProtectedRoute>} />
              <Route path="*"             element={<Navigate to={userRole === 'staff' ? '/dashboard' : '/'} />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  )
}