import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Rentals from './pages/Rentals'
import Customers from './pages/Customers'
import Login from './pages/Login'

const NAV = [
  { path: '/',          label: 'לוח בקרה',  icon: '📊' },
  { path: '/inventory', label: 'מלאי',       icon: '📦' },
  { path: '/rentals',   label: 'השכרות',     icon: '📋' },
  { path: '/customers', label: 'לקוחות',     icon: '👤' },
]

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={styles.splash}>
      <div style={styles.splashText}>⏳ טוען...</div>
    </div>
  )

  if (!session) return <Login />

  return (
    <BrowserRouter>
      <div style={styles.layout}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <div style={styles.logo}>🏔️ אוורסט - השכרת ציוד</div>
          <nav style={styles.nav}>
            {NAV.map(n => (
              <NavLink key={n.path} to={n.path} end={n.path === '/'}
                style={({ isActive }) => ({ ...styles.navItem, ...(isActive ? styles.navActive : {}) })}>
                <span>{n.icon}</span> {n.label}
              </NavLink>
            ))}
          </nav>
          <button style={styles.logout} onClick={() => supabase.auth.signOut()}>
            🚪 התנתק
          </button>
        </aside>

        {/* Main */}
        <main style={styles.main}>
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

const styles = {
  splash: { display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0a0f1a' },
  splashText: { color:'#f8b942', fontSize:24 },
  layout: { display:'flex', height:'100vh', background:'#0a0f1a', color:'#e8edf5', fontFamily:'Segoe UI, Tahoma, sans-serif', direction:'rtl' },
  sidebar: { width:220, background:'#111827', borderLeft:'1px solid #1e2d40', display:'flex', flexDirection:'column', padding:'24px 12px' },
  logo: { fontSize:20, fontWeight:800, color:'#f8b942', padding:'0 8px 24px', borderBottom:'1px solid #1e2d40', marginBottom:16 },
  nav: { display:'flex', flexDirection:'column', gap:4, flex:1 },
  navItem: { display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, color:'#7a9bb5', textDecoration:'none', fontSize:14, transition:'all 0.2s' },
  navActive: { background:'linear-gradient(135deg,#f8b942,#f57c00)', color:'#0a0f1a', fontWeight:700 },
  logout: { background:'transparent', border:'1px solid #1e2d40', color:'#7a9bb5', padding:'10px', borderRadius:10, cursor:'pointer', fontSize:13 },
  main: { flex:1, overflowY:'auto', padding:32 },
}