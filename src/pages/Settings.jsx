import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const T = {
  bg:'#0d0d0d', surface:'#161616', card:'#1a1a1a', border:'#2a2a2a',
  red:'#e53935', redDark:'#b71c1c', redGlow:'rgba(229,57,53,0.18)',
  text:'#f0f0f0', muted:'#888',
  neo:'inset 2px 2px 5px rgba(0,0,0,0.6), inset -2px -2px 5px rgba(255,255,255,0.04)',
  neoOut:'4px 4px 10px rgba(0,0,0,0.6), -2px -2px 6px rgba(255,255,255,0.03)',
}

const COLORS  = ['#e53935','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6','#3b82f6','#94a3b8','#f97316']
const ICONS_EQ = ['📦','🔊','💡','⛺','🪑','🎛️','🎤','📽️','🎪','🔧','🎵','🎶','🎸','🥁','🎹','🎺','🎻','🎧','📻','🔌','🔋','💻','📷','🎥','📹','🎞️','🖥️','📺','📡','🔦','🕯️','🏮','🎆','🎇','✨','🌟','💫','🎠','🎡','🎢','🎨','🎀','🎁','🎊','🎉','🪅','🍽️','🥂','🍾','🎂','⛱️','📢','📣','🎭','🎬','🚗','⚡','🧲','🔈']
const ICONS_EXP = ['💰','🏠','🚗','🔧','👷','📣','💡','📦','🍽️','✈️','📱','💻','🏥','📚','💳','🏦','📊','🧾','🪙','💵','🤝','📋','📝','🖨️','⛽','🅿️','🚚','🛒','🧹','🔑','🏢','🏗️','⚙️','🛠️','🪚','🔩','📐','🎪','🎤','🎵']

const EMPTY_EQ  = { name:'', icon:'📦' }
const EMPTY_EXP = { name:'', icon:'💰', color:T.red }

const inp = { width:'100%', background:'#111', border:`1px solid #333`, color:T.text, borderRadius:10, padding:'11px 14px', fontSize:14, outline:'none', boxSizing:'border-box', transition:'all 0.2s' }
const lbl = { display:'block', fontSize:11, fontWeight:700, color:T.muted, marginBottom:6, letterSpacing:1.5, textTransform:'uppercase' }

export default function Settings() {
  const [tab, setTab]         = useState('equipment')
  const [eqCats, setEqCats]   = useState([])
  const [expCats, setExpCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(EMPTY_EQ)
  const [saving, setSaving]   = useState(false)

  const load = async () => {
    setLoading(true)
    const [{ data:eq }, { data:exp }] = await Promise.all([
      supabase.from('equipment_categories').select('*').order('name'),
      supabase.from('expense_categories').select('*').order('name'),
    ])
    setEqCats(eq||[]); setExpCats(exp||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openAdd  = () => { setForm(tab==='equipment' ? EMPTY_EQ : EMPTY_EXP); setModal(true) }
  const openEdit = (cat) => { setForm(cat); setModal(true) }

  const save = async () => {
    if (!form.name?.trim()) return alert('נא להזין שם קטגוריה')
    setSaving(true)
    const table = tab==='equipment' ? 'equipment_categories' : 'expense_categories'
    if (form.id) await supabase.from(table).update(form).eq('id', form.id)
    else         await supabase.from(table).insert(form)
    await load(); setModal(false); setForm(tab==='equipment' ? EMPTY_EQ : EMPTY_EXP); setSaving(false)
  }

  const del = async (id) => {
    if (!confirm('למחוק קטגוריה זו?')) return
    const table = tab==='equipment' ? 'equipment_categories' : 'expense_categories'
    await supabase.from(table).delete().eq('id', id); await load()
  }

  const cats  = tab==='equipment' ? eqCats : expCats
  const icons = tab==='equipment' ? ICONS_EQ : ICONS_EXP

  return (
    <div style={{ direction:'rtl', color:T.text }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .cat-row{transition:background 0.15s;}
        .cat-row:hover{background:rgba(229,57,53,0.05)!important;}
        .icon-btn{transition:all 0.15s;opacity:0.3;background:transparent;border:none;cursor:pointer;font-size:15px;padding:4px;}
        .icon-btn:hover{opacity:1;transform:scale(1.2);}
        .icon-pick{transition:all 0.15s;cursor:pointer;border-radius:8px;padding:5px;font-size:22px;display:inline-flex;}
        .icon-pick:hover{background:${T.redGlow};transform:scale(1.15);}
        .icon-pick.sel{background:${T.redGlow};outline:2px solid ${T.red};}
        .tab-btn{transition:all 0.15s;cursor:pointer;}
        .tab-btn:hover{border-color:${T.red}!important;color:${T.red}!important;}
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
            <div style={{ width:4, height:28, background:`linear-gradient(${T.red},${T.redDark})`, borderRadius:4 }} />
            <h1 style={{ fontSize:26, fontWeight:900, color:T.text, letterSpacing:1 }}>הגדרות</h1>
          </div>
          <p style={{ color:T.muted, fontSize:13, paddingRight:16 }}>ניהול קטגוריות</p>
        </div>
        <button className="neo-btn" onClick={openAdd} style={{ padding:'11px 22px', fontSize:14, borderRadius:12 }}>
          + קטגוריה חדשה
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        {[{ key:'equipment', label:'📦 קטגוריות ציוד' }, { key:'expense', label:'💸 קטגוריות הוצאות' }].map(t => (
          <button key={t.key} className="tab-btn" onClick={() => setTab(t.key)}
            style={{ padding:'10px 20px', borderRadius:12, border:'1px solid', fontSize:13, fontWeight:700,
              borderColor: tab===t.key ? T.red : T.border,
              background:  tab===t.key ? T.redGlow : T.card,
              color:       tab===t.key ? T.red : T.muted,
              boxShadow:   tab===t.key ? `0 0 12px ${T.redGlow}` : T.neoOut }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:80 }}>
          <div style={{ width:36, height:36, border:`3px solid ${T.border}`, borderTop:`3px solid ${T.red}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div style={{ background:T.card, borderRadius:16, border:`1px solid ${T.border}`, boxShadow:T.neoOut, overflow:'hidden' }}>
          <div style={{ padding:'14px 22px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:4, height:16, background:`linear-gradient(${T.red},${T.redDark})`, borderRadius:4 }} />
              <span style={{ fontWeight:700, fontSize:13, color:T.text }}>{tab==='equipment' ? 'קטגוריות ציוד' : 'קטגוריות הוצאות'}</span>
            </div>
            <span style={{ fontSize:11, color:T.muted }}>{cats.length} קטגוריות</span>
          </div>

          {cats.length===0
            ? <div style={{ padding:'60px 0', textAlign:'center', color:T.muted }}>
                <div style={{ fontSize:36, marginBottom:10, opacity:0.2 }}>📂</div>
                <div style={{ fontSize:12, letterSpacing:1 }}>אין קטגוריות עדיין</div>
              </div>
            : cats.map((cat,i) => (
              <div key={cat.id} className="cat-row"
                style={{ display:'flex', alignItems:'center', padding:'14px 22px', borderBottom:i<cats.length-1?`1px solid ${T.border}`:'none', animation:`fadeUp 0.25s ease ${i*0.04}s both` }}>
                <div style={{ width:40, height:40, borderRadius:12, background:`${cat.color||T.red}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, marginLeft:14, flexShrink:0, border:`1px solid ${cat.color||T.red}33` }}>
                  {cat.icon}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:14, color:T.text }}>{cat.name}</div>
                  {cat.color && (
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:cat.color, boxShadow:`0 0 6px ${cat.color}` }} />
                      <span style={{ fontSize:10, color:T.muted, letterSpacing:1 }}>{cat.color}</span>
                    </div>
                  )}
                </div>
                <div style={{ display:'flex', gap:4 }}>
                  <button className="icon-btn" onClick={() => openEdit(cat)}>✏️</button>
                  <button className="icon-btn" onClick={() => del(cat.id)}>🗑️</button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(8px)' }}>
          <div style={{ background:T.surface, borderRadius:20, padding:32, width:460, maxHeight:'90vh', overflowY:'auto', direction:'rtl', boxShadow:`0 24px 60px rgba(0,0,0,0.9),0 0 40px ${T.redGlow}`, border:`1px solid ${T.border}`, animation:'fadeUp 0.25s ease' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
              <div style={{ width:4, height:22, background:`linear-gradient(${T.red},${T.redDark})`, borderRadius:4 }} />
              <h2 style={{ margin:0, fontSize:17, fontWeight:900, color:T.text }}>{form.id ? 'עריכת קטגוריה' : 'קטגוריה חדשה'}</h2>
            </div>

            {/* שם */}
            <div style={{ marginBottom:16 }}>
              <label style={lbl}>שם הקטגוריה *</label>
              <input style={{ ...inp, background:T.card, boxShadow:T.neo }} type="text" placeholder="לדוגמה: תאורת במה" value={form.name||''}
                onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                onFocus={e=>e.target.style.borderColor=T.red} onBlur={e=>e.target.style.borderColor='#333'} />
            </div>

            {/* אייקון */}
            <div style={{ marginBottom:16 }}>
              <label style={lbl}>אייקון — נבחר: {form.icon}</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:3, background:T.card, borderRadius:10, padding:10, border:`1px solid ${T.border}`, maxHeight:150, overflowY:'auto', boxShadow:T.neo }}>
                {icons.map(icon => (
                  <span key={icon} className={`icon-pick${form.icon===icon?' sel':''}`}
                    onClick={() => setForm(p=>({...p,icon}))}>
                    {icon}
                  </span>
                ))}
              </div>
            </div>

            {/* צבע — רק להוצאות */}
            {tab==='expense' && (
              <div style={{ marginBottom:16 }}>
                <label style={lbl}>צבע</label>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {COLORS.map(c => (
                    <div key={c} onClick={() => setForm(p=>({...p,color:c}))}
                      style={{ width:28, height:28, borderRadius:'50%', background:c, cursor:'pointer', transition:'all 0.15s', transform:form.color===c?'scale(1.25)':'scale(1)', border:form.color===c?`3px solid ${T.text}`:'3px solid transparent', boxShadow:form.color===c?`0 0 10px ${c}`:'none' }} />
                  ))}
                </div>
              </div>
            )}

            {/* תצוגה מקדימה */}
            <div style={{ background:T.card, borderRadius:10, padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:12, border:`1px solid ${T.border}` }}>
              <div style={{ width:38, height:38, borderRadius:10, background:`${form.color||T.red}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, border:`1px solid ${form.color||T.red}33` }}>
                {form.icon}
              </div>
              <div>
                <div style={{ fontWeight:600, fontSize:14, color:T.text }}>{form.name||'שם הקטגוריה'}</div>
                {form.color && <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:4 }}><div style={{ width:8, height:8, borderRadius:'50%', background:form.color, boxShadow:`0 0 6px ${form.color}` }} /><span style={{ fontSize:10, color:T.muted }}>{form.color}</span></div>}
              </div>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button className="neo-btn" onClick={save} disabled={saving} style={{ flex:1, padding:'13px', fontSize:15, borderRadius:12 }}>
                {saving?'שומר...':'שמור'}
              </button>
              <button onClick={() => setModal(false)}
                style={{ flex:1, background:T.card, border:`1px solid ${T.border}`, color:T.muted, fontWeight:600, padding:'13px', borderRadius:12, cursor:'pointer', fontSize:15, boxShadow:T.neoOut, transition:'all 0.2s' }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=T.red} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}