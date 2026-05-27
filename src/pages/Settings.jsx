import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const COLORS = ['#6366f1','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6','#3b82f6','#94a3b8','#f97316']
const ICONS_EQ  = ['📦','🔊','💡','⛺','🪑','🎛️','🎤','📽️','🎪','🔧','🚗','⚡','🎭','🎬']
const ICONS_EXP = ['💰','🏠','🚗','🔧','👷','📣','💡','📦','🍽️','✈️','📱','💻','🏥','📚']

const EMPTY_EQ  = { name:'', icon:'📦' }
const EMPTY_EXP = { name:'', icon:'💰', color:'#6366f1' }

export default function Settings() {
  const [tab, setTab]               = useState('equipment')
  const [eqCats, setEqCats]         = useState([])
  const [expCats, setExpCats]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(false)
  const [form, setForm]             = useState(EMPTY_EQ)
  const [saving, setSaving]         = useState(false)

  const load = async () => {
    setLoading(true)
    const [{ data: eq }, { data: exp }] = await Promise.all([
      supabase.from('equipment_categories').select('*').order('name'),
      supabase.from('expense_categories').select('*').order('name'),
    ])
    setEqCats(eq || [])
    setExpCats(exp || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setForm(tab === 'equipment' ? EMPTY_EQ : EMPTY_EXP)
    setModal(true)
  }

  const openEdit = (cat) => {
    setForm(cat)
    setModal(true)
  }

  const save = async () => {
    if (!form.name.trim()) return alert('נא להזין שם קטגוריה')
    setSaving(true)
    const table = tab === 'equipment' ? 'equipment_categories' : 'expense_categories'
    if (form.id) {
      await supabase.from(table).update(form).eq('id', form.id)
    } else {
      await supabase.from(table).insert(form)
    }
    await load()
    setModal(false)
    setForm(tab === 'equipment' ? EMPTY_EQ : EMPTY_EXP)
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm('למחוק קטגוריה זו?')) return
    const table = tab === 'equipment' ? 'equipment_categories' : 'expense_categories'
    await supabase.from(table).delete().eq('id', id)
    await load()
  }

  const cats = tab === 'equipment' ? eqCats : expCats
  const icons = tab === 'equipment' ? ICONS_EQ : ICONS_EXP

  return (
    <div style={{ direction:'rtl' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        .cat-row { transition: background 0.15s; }
        .cat-row:hover { background: #f8fafc !important; }
        .icon-btn { transition: all 0.15s; opacity:0.4; }
        .icon-btn:hover { opacity:1; transform:scale(1.1); }
        .icon-pick { transition: all 0.15s; cursor:pointer; border-radius:8px; padding:4px; }
        .icon-pick:hover { background: #eef2ff; transform:scale(1.1); }
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px' }}>הגדרות</h1>
          <p style={{ color:'#94a3b8', fontSize:13, marginTop:3 }}>ניהול קטגוריות</p>
        </div>
        <button onClick={openAdd}
          style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontWeight:700, padding:'10px 20px', borderRadius:12, cursor:'pointer', fontSize:14, boxShadow:'0 4px 12px rgba(99,102,241,0.25)', transition:'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
          + קטגוריה חדשה
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        {[
          { key:'equipment', label:'קטגוריות ציוד',    icon:'📦' },
          { key:'expense',   label:'קטגוריות הוצאות',  icon:'💸' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:'10px 20px', borderRadius:12, border:'1px solid', fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', gap:8, transition:'all 0.15s',
              borderColor: tab===t.key ? '#6366f1' : '#e2e8f0',
              background:  tab===t.key ? '#eef2ff' : '#fff',
              color:       tab===t.key ? '#6366f1' : '#64748b',
              fontWeight:  tab===t.key ? 700 : 400 }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
          <div style={{ width:32, height:32, border:'3px solid #e2e8f0', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
        </div>
      ) : (
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden' }}>
          <div style={{ padding:'14px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontWeight:700, fontSize:14, color:'#1e293b' }}>
              {tab === 'equipment' ? '📦 קטגוריות ציוד' : '💸 קטגוריות הוצאות'}
            </span>
            <span style={{ fontSize:13, color:'#94a3b8' }}>{cats.length} קטגוריות</span>
          </div>

          {cats.length === 0 ? (
            <div style={{ padding:'60px 0', textAlign:'center', color:'#94a3b8' }}>
              <div style={{ fontSize:36, marginBottom:10 }}>📂</div>
              <div>אין קטגוריות עדיין</div>
            </div>
          ) : cats.map((cat, i) => (
            <div key={cat.id} className="cat-row"
              style={{ display:'flex', alignItems:'center', padding:'14px 24px', borderBottom: i<cats.length-1 ? '1px solid #f8fafc' : 'none', animation:`fadeUp 0.25s ease ${i*0.04}s both` }}>

              {/* אייקון + צבע */}
              <div style={{ width:40, height:40, borderRadius:12, background: cat.color ? `${cat.color}18` : '#eef2ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, marginLeft:14, flexShrink:0 }}>
                {cat.icon}
              </div>

              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:15, color:'#1e293b' }}>{cat.name}</div>
                {cat.color && (
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:cat.color }} />
                    <span style={{ fontSize:11, color:'#94a3b8' }}>{cat.color}</span>
                  </div>
                )}
              </div>

              <div style={{ display:'flex', gap:6 }}>
                <button className="icon-btn" onClick={() => openEdit(cat)}
                  style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:16, padding:6 }}>✏️</button>
                <button className="icon-btn" onClick={() => del(cat.id)}
                  style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:16, padding:6 }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'#fff', borderRadius:20, padding:32, width:420, direction:'rtl', boxShadow:'0 24px 60px rgba(0,0,0,0.15)', animation:'fadeUp 0.25s ease' }}>
            <h2 style={{ margin:'0 0 24px', fontSize:18, fontWeight:800, color:'#0f172a' }}>
              {form.id ? '✏️ עריכת קטגוריה' : '➕ קטגוריה חדשה'}
            </h2>

            {/* שם */}
            <div style={{ marginBottom:16 }}>
              <label style={lbl}>שם הקטגוריה *</label>
              <input style={inp} type="text" placeholder="לדוגמה: ריהוט" value={form.name}
                onChange={e => setForm(p => ({...p, name:e.target.value}))}
                onFocus={e => e.target.style.borderColor='#6366f1'}
                onBlur={e => e.target.style.borderColor='#e2e8f0'} />
            </div>

            {/* אייקון */}
            <div style={{ marginBottom:16 }}>
              <label style={lbl}>אייקון</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, background:'#f8fafc', borderRadius:10, padding:10, border:'1px solid #e2e8f0' }}>
                {icons.map(icon => (
                  <span key={icon} className="icon-pick"
                    onClick={() => setForm(p => ({...p, icon}))}
                    style={{ fontSize:22, opacity: form.icon===icon ? 1 : 0.5, background: form.icon===icon ? '#eef2ff' : 'transparent', outline: form.icon===icon ? '2px solid #6366f1' : 'none' }}>
                    {icon}
                  </span>
                ))}
              </div>
            </div>

            {/* צבע — רק להוצאות */}
            {tab === 'expense' && (
              <div style={{ marginBottom:16 }}>
                <label style={lbl}>צבע</label>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {COLORS.map(c => (
                    <div key={c} onClick={() => setForm(p => ({...p, color:c}))}
                      style={{ width:28, height:28, borderRadius:'50%', background:c, cursor:'pointer', border: form.color===c ? '3px solid #1e293b' : '2px solid transparent', transition:'all 0.15s', transform: form.color===c ? 'scale(1.2)' : 'scale(1)' }} />
                  ))}
                </div>
              </div>
            )}

            {/* תצוגה מקדימה */}
            <div style={{ background:'#f8fafc', borderRadius:10, padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:38, height:38, borderRadius:10, background: form.color ? `${form.color}18` : '#eef2ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
                {form.icon}
              </div>
              <div>
                <div style={{ fontWeight:600, fontSize:14, color:'#1e293b' }}>{form.name || 'שם הקטגוריה'}</div>
                {form.color && <div style={{ width:10, height:10, borderRadius:'50%', background:form.color, marginTop:4 }} />}
              </div>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={save} disabled={saving}
                style={{ flex:1, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontWeight:700, padding:'13px', borderRadius:12, cursor:'pointer', fontSize:15 }}>
                {saving ? 'שומר...' : 'שמור'}
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