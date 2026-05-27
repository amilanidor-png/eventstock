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
import Login from './pages/Login'
import GlobalSearch from './GlobalSearch'

const NAV = [
  { path: '/',          label: 'בקרה',    icon: '📊' },
  { path: '/inventory', label: 'מלאי',    icon: '📦' },
  { path: '/rentals',   label: 'השכרות',  icon: '📋' },
  { path: '/customers', label: 'לקוחות',  icon: '👤' },
  { path: '/calendar',  label: 'לוח שנה', icon: '📅' },
  { path: '/business',  label: 'עסק',     icon: '💼' },
  { path: '/settings',  label: 'הגדרות',  icon: '⚙️' },
]

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mobile, setMobile]   = useState(window.innerWidth < 768)

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
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

  if (!session) return <Login />

  return (
    <BrowserRouter>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f8f9fb; }
        .nav-link { transition: all 0.2s ease; }
        .nav-link:hover { background: #f1f5f9 !important; color: #1e293b !important; }
        .card { transition: box-shadow 0.2s ease, transform 0.2s ease; }
        .card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important; transform: translateY(-1px); }
        .fade-in { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>

      <div style={{ display:'flex', flexDirection: mobile ? 'column' : 'row', minHeight:'100vh', background:'#f8f9fb', fontFamily:'"Inter", "Segoe UI", sans-serif', direction:'rtl' }}>

        {mobile ? (
          <nav style={{ position:'fixed', bottom:0, right:0, left:0, background:'#fff', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'space-around', padding:'6px 0 8px', zIndex:100, boxShadow:'0 -4px 20px rgba(0,0,0,0.06)' }}>
            {NAV.slice(0,6).map(n => (
              <NavLink key={n.path} to={n.path} end={n.path === '/'}
                style={({ isActive }) => ({
                  display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                  color: isActive ? '#6366f1' : '#94a3b8',
                  textDecoration:'none', fontSize:9, fontWeight: isActive ? 700 : 400,
                  padding:'4px 6px', borderRadius:8, transition:'all 0.2s'
                })}>
                <span style={{ fontSize:16 }}>{n.icon}</span>
                {n.label}
              </NavLink>
            ))}
            <NavLink to="/settings" style={({ isActive }) => ({
              display:'flex', flexDirection:'column', alignItems:'center', gap:2,
              color: isActive ? '#6366f1' : '#94a3b8',
              textDecoration:'none', fontSize:9, fontWeight: isActive ? 700 : 400,
              padding:'4px 6px', borderRadius:8
            })}>
              <span style={{ fontSize:16 }}>⚙️</span>הגדרות
            </NavLink>
          </nav>
        ) : (
          <aside style={{ width:230, background:'#fff', borderLeft:'1px solid #e2e8f0', display:'flex', flexDirection:'column', padding:'24px 16px', boxShadow:'2px 0 12px rgba(0,0,0,0.04)' }}>
            <div style={{ padding:'4px 8px 20px', borderBottom:'1px solid #f1f5f9', marginBottom:16 }}>
              <div style={{ fontSize:18, fontWeight:800, color:'#1e293b', letterSpacing:'-0.3px' }}>🏔️ אוורסט</div>
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:3 }}>השכרת ציוד אירועים</div>
            </div>

            <GlobalSearch />

            <nav style={{ display:'flex', flexDirection:'column', gap:2, flex:1 }}>
              {NAV.map(n => (
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
              <Route path="/"          element={<Dashboard />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/rentals"   element={<Rentals />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/calendar"  element={<Calendar />} />
              <Route path="/business"  element={<Business />} />
              <Route path="/settings"  element={<Settings />} />
              <Route path="*"          element={<Navigate to="/" />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  )
}