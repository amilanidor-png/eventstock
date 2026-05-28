import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
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

const MOBILE_MAIN = ['dashboard', 'rentals', 'inventory', 'customers']

function MobileNav({ nav }) {
  const [showMore, setShowMore] = useState(false)
  const mainPaths  = nav.filter(n => MOBILE_MAIN.some(m => n.path === `/${m}` || (m === 'dashboard' && n.path === '/dashboard')))
  const moreItems  = nav.filter(n => !mainPaths.includes(n))

  return (
    <>
      {showMore && (
        <div style={{ position:'fixed', bottom:65, right:0, left:0, background:'#fff', borderTop:'1px solid #e2e8f0', zIndex:99, boxShadow:'0 -4px 20px rgba(0,0,0,0.1)', direction:'rtl' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', padding:'12px 8px' }}>
            {moreItems.map(n => (
              <NavLink key={n.path} to={n.path} end={n.path === '/'}
                onClick={() => setShowMore(false)}
                style={({ isActive }) => ({
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                  color: isActive ? '#6366f1' : '#64748b',
                  textDecoration:'none', fontSize:11, fontWeight: isActive ? 700 : 400,
                  padding:'10px 4px', borderRadius:10,
                  background: isActive ? '#eef2ff' : 'transparent',
                })}>
                <span style={{ fontSize:22 }}>{n.icon}</span>
                {n.label}
              </NavLink>
            ))}
            <button onClick={() => { supabase.auth.signOut(); setShowMore(false) }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, background:'transparent', border:'none', color:'#ef4444', fontSize:11, cursor:'pointer', padding:'10px 4px', borderRadius:10 }}>
              <span style={{ fontSize:22 }}>🚪</span>יציאה
            </button>
          </div>
        </div>
      )}
      {showMore && <div style={{ position:'fixed', inset:0, zIndex:98 }} onClick={() => setShowMore(false)} />}

      <nav style={{ position:'fixed', bottom:0, right:0, left:0, background:'#fff', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'space-around', padding:'6px 0 8px', zIndex:100, boxShadow:'0 -4px 20px rgba(0,0,0,0.06)' }}>
        {mainPaths.slice(0,4).map(n => (
          <NavLink key={n.path} to={n.path} end={n.path === '/'}
            style={({ isActive }) => ({
              display:'flex', flexDirection:'column', alignItems:'center', gap:2,
              color: isActive ? '#6366f1' : '#94a3b8',
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
              color: showMore ? '#6366f1' : '#94a3b8', fontSize:10, cursor:'pointer', padding:'4px 12px', borderRadius:8, fontWeight: showMore ? 700 : 400 }}>
            <span style={{ fontSize:20 }}>{showMore ? '✕' : '⋯'}</span>
            עוד
          </button>
        )}
      </nav>
    </>
  )
}

function ProtectedRoute({ children, allowedRoles, userRole }) {
  if (!allowedRoles.includes(userRole)) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh', color:'#94a3b8', direction:'rtl' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
        <div style={{ fontSize:18, fontWeight:700, color:'#1e293b' }}>אין לך הרשאה לצפות בדף זה</div>
        <div style={{ fontSize:13, marginTop:8 }}>דף זה מיועד לבעלים ומנהלים בלבד</div>
      </div>
    )
  }
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

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.session.user.id).single()
        setProfile(prof)
      }
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s)
      if (s) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', s.user.id).single()
        setProfile(prof)
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#f8f9fb' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
        <div style={{ width:40, height:40, border:'3px solid #e2e8f0', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <span style={{ color:'#94a3b8', fontSize:14 }}>טוען...</span>
      </div>
    </div>
  )

  if (window.location.pathname.startsWith('/contract/')) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/contract/:id" element={<Contract />} />
        </Routes>
      </BrowserRouter>
    )
  }

  if (!session) return <Login />

  const userRole = profile?.role || 'staff'
  const nav      = ALL_NAV.filter(n => n.roles.includes(userRole))

  return (
    <BrowserRouter>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f8f9fb; }
        .nav-link { transition: all 0.2s ease; }
        .nav-link:hover { background: #f1f5f9 !important; color: #1e293b !important; }
        .fade-in { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>

      <div style={{ display:'flex', flexDirection: mobile ? 'column' : 'row', minHeight:'100vh', background:'#f8f9fb', fontFamily:'"Inter", "Segoe UI", sans-serif', direction:'rtl' }}>

        {mobile ? (
          <MobileNav nav={nav} />
        ) : (
          <aside style={{ width:230, background:'#fff', borderLeft:'1px solid #e2e8f0', display:'flex', flexDirection:'column', padding:'24px 16px', boxShadow:'2px 0 12px rgba(0,0,0,0.04)' }}>
            <div style={{ padding:'4px 8px 20px', borderBottom:'1px solid #f1f5f9', marginBottom:16 }}>
              <div style={{ fontSize:18, fontWeight:800, color:'#1e293b', letterSpacing:'-0.3px' }}>🏔️ אוורסט</div>
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:3 }}>
                {profile?.full_name || ''} · {userRole === 'owner' ? 'בעלים' : userRole === 'manager' ? 'מנהל' : 'עובד'}
              </div>
            </div>

            <GlobalSearch />

            <nav style={{ display:'flex', flexDirection:'column', gap:2, flex:1, overflowY:'auto' }}>
              {nav.map(n => (
                <NavLink key={n.path} to={n.path} end={n.path === '/'}
                  className="nav-link"
                  style={({ isActive }) => ({
                    display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                    borderRadius:10, textDecoration:'none', fontSize:14,
                    color: isActive ? '#6366f1' : '#64748b',
                    background: isActive ? '#eef2ff' : 'transparent',
                    fontWeight: isActive ? 600 : 400,
                  })}>
                  <span style={{ fontSize:16 }}>{n.icon}</span>{n.label}
                </NavLink>
              ))}
            </nav>

            <button
              style={{ background:'transparent', border:'1px solid #e2e8f0', color:'#94a3b8', padding:'9px', borderRadius:10, cursor:'pointer', fontSize:13, transition:'all 0.2s', marginTop:8 }}
              onMouseEnter={e => e.target.style.background='#fee2e2'}
              onMouseLeave={e => e.target.style.background='transparent'}
              onClick={() => supabase.auth.signOut()}>
              🚪 התנתק
            </button>
          </aside>
        )}

        <main style={{ flex:1, overflowY:'auto', padding: mobile ? '20px 16px 80px' : '32px 36px' }}>
          <div className="fade-in">
            <Routes>
              <Route path="/" element={
                <ProtectedRoute allowedRoles={['owner','manager']} userRole={userRole}>
                  <Business />
                </ProtectedRoute>
              } />
              <Route path="/dashboard"  element={<Dashboard />} />
              <Route path="/inventory"  element={<Inventory />} />
              <Route path="/rentals"    element={<Rentals />} />
              <Route path="/payments"   element={
                <ProtectedRoute allowedRoles={['owner','manager']} userRole={userRole}>
                  <Payments />
                </ProtectedRoute>
              } />
              <Route path="/customers"  element={<Customers />} />
              <Route path="/contracts"  element={
                <ProtectedRoute allowedRoles={['owner','manager']} userRole={userRole}>
                  <ContractManager />
                </ProtectedRoute>
              } />
              <Route path="/contract/:id" element={<Contract />} />
              <Route path="/calendar"   element={<Calendar />} />
              <Route path="/team"       element={
                <ProtectedRoute allowedRoles={['owner','manager']} userRole={userRole}>
                  <Team />
                </ProtectedRoute>
              } />
              <Route path="/settings"   element={
                <ProtectedRoute allowedRoles={['owner','manager']} userRole={userRole}>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to={userRole === 'staff' ? '/dashboard' : '/'} />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  )
}