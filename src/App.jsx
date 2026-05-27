import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Rentals from './pages/Rentals'
import Customers from './pages/Customers'
import Login from './pages/Login'

const NAV = [
  { path: '/',          label: 'בקרה',  icon: '📊' },
  { path: '/inventory', label: 'מלאי',  icon: '📦' },
  { path: '/rentals',   label: 'השכרות', icon: '📋' },
  { path: '/customers', label: 'לקוחות', icon: '👤' },
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
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0a0f1a' }}>
      <div style={{ color:'#f8b942', fontSize:24 }}>⏳ טוען...</div>
    </div>
  )

  if (!session) return <Login />

  return (
    <BrowserRouter>
      <div style={{ display:'flex', flexDirection: mobile ? 'column' : 'row', minHeight:'100vh', background:'#0a0f1a', color:'#e8edf5', fontFamily:'Segoe UI, Tahoma, sans-serif', direction:'rtl' }}>

        {/* Sidebar / Bottom nav */}
        {mobile ? (
          <nav style={{ position:'fixed', bottom:0, right:0, left:0, background:'#111827', borderTop:'1px solid #1e2d40', display:'flex', justifyContent:'space-around', padding:'8px 0', zIndex:100 }}>
            {NAV.map(n => (
              <NavLink key={n.path} to={n.path} end={n.path === '/'}
                style={({ isActive }) => ({
                  display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                  color: isActive ? '#f8b942' : '#7a9bb5',
                  textDecoration:'none', fontSize:10, fontWeight: isActive ? 700 : 400,
                  padding:'4px 12px'
                })}>
                <span style={{ fontSize:20 }}>{n.icon}</span>
                {n.label}
              </NavLink>
            ))}
            <button onClick={() => supabase.auth.signOut()}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, background:'transparent', border:'none', color:'#7a9bb5', fontSize:10, cursor:'pointer', padding:'4px 12px' }}>
              <span style={{ fontSize:20 }}>🚪</span>יציאה
            </button>
          </nav>
        ) : (
          <aside style={{ width:220, background:'#111827', borderLeft:'1px solid #1e2d40', display:'flex', flexDirection:'column', padding:'24px 12px' }}>
            <div style={{ fontSize:20, fontWeight:800, color:'#f8b942', padding:'0 8px 24px', borderBottom:'1px solid #1e2d40', marginBottom:16 }}>
              🏔️ אוורסט
            </div>
            <nav style={{ display:'flex', flexDirection:'column', gap:4, flex:1 }}>
              {NAV.map(n => (
                <NavLink key={n.path} to={n.path} end={n.path === '/'}
                  style={({ isActive }) => ({
                    display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                    borderRadius:10, color: isActive ? '#0a0f1a' : '#7a9bb5',
                    textDecoration:'none', fontSize:14,
                    background: isActive ? 'linear-gradient(135deg,#f8b942,#f57c00)' : 'transparent',
                    fontWeight: isActive ? 700 : 400
                  })}>
                  <span>{n.icon}</span>{n.label}
                </NavLink>
              ))}
            </nav>
            <button style={{ background:'transparent', border:'1px solid #1e2d40', color:'#7a9bb5', padding:'10px', borderRadius:10, cursor:'pointer', fontSize:13 }}
              onClick={() => supabase.auth.signOut()}>
              🚪 התנתק
            </button>
          </aside>
        )}

        {/* Main content */}
        <main style={{ flex:1, overflowY:'auto', padding: mobile ? '16px 16px 80px' : 32 }}>
          <Routes>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/rentals"   element={<Rentals />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="*"          element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}