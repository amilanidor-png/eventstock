import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'

const T = {
  bg:'#0d0d0d', surface:'#161616', card:'#1a1a1a', border:'#2a2a2a',
  red:'#e53935', redDark:'#b71c1c', redGlow:'rgba(229,57,53,0.18)',
  text:'#f0f0f0', muted:'#888',
  neo:'inset 2px 2px 5px rgba(0,0,0,0.6), inset -2px -2px 5px rgba(255,255,255,0.04)',
  neoOut:'4px 4px 10px rgba(0,0,0,0.6), -2px -2px 6px rgba(255,255,255,0.03)',
}

const CONDS      = { excellent:'מצוין', good:'טוב', fair:'בינוני', maintenance:'תחזוקה' }
const COND_COLOR = { excellent:'#10b981', good:'#f59e0b', fair:'#f97316', maintenance:T.red }
const EMPTY      = { name:'', category_id:'', description:'', daily_rate:'', quantity_total:'', condition:'excellent', notes:'', image_url:'' }

const inp = { width:'100%', background:'#111', border:`1px solid #333`, color:T.text, borderRadius:10, padding:'11px 14px', fontSize:14, outline:'none', boxSizing:'border-box', transition:'all 0.2s' }
const lbl = { display:'block', fontSize:11, fontWeight:700, color:T.muted, marginBottom:6, letterSpacing:1.5, textTransform:'uppercase' }

export default function Inventory() {
  const [items, setItems]         = useState([])
  const [cats, setCats]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch]       = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const fileRef                   = useRef(null)

  const load = async () => {
    const [{ data: eq }, { data: categories }] = await Promise.all([
      supabase.from('equipment').select('*, equipment_categories(id, name, icon)').eq('is_active', true).order('name'),
      supabase.from('equipment_categories').select('*').order('name'),
    ])
    setItems(eq || [])
    setCats(categories || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const uploadImage = async (file) => {
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('equipment-images').upload(path, file)
    if (error) { alert('שגיאה בהעלאת תמונה'); setUploading(false); return null }
    const { data } = supabase.storage.from('equipment-images').getPublicUrl(path)
    setUploading(false)
    return data.publicUrl
  }

  const save = async () => {
    if (!form.name || !form.daily_rate || !form.quantity_total) return alert('נא למלא שדות חובה')
    setSaving(true)
    let image_url = form.image_url
    if (fileRef.current?.files[0]) {
      image_url = await uploadImage(fileRef.current.files[0])
      if (!image_url) { setSaving(false); return }
    }
    const payload = { name:form.name, category_id:form.category_id||null, description:form.description, daily_rate:+form.daily_rate, quantity_total:+form.quantity_total, condition:form.condition, notes:form.notes, image_url }
    if (form.id) await supabase.from('equipment').update(payload).eq('id', form.id)
    else         await supabase.from('equipment').insert(payload)
    await load()
    setModal(false); setForm(EMPTY)
    if (fileRef.current) fileRef.current.value = ''
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm('למחוק פריט זה?')) return
    await supabase.from('equipment').update({ is_active:false }).eq('id', id)
    setItems(p => p.filter(i => i.id !== id))
  }

  const filtered = items.filter(i => (catFilter==='all' || i.category_id===catFilter) && i.name.includes(search))

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:80 }}>
      <div style={{ width:36, height:36, border:`3px solid ${T.border}`, borderTop:`3px solid ${T.red}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ direction:'rtl', color:T.text }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .inv-card{transition:box-shadow 0.2s,transform 0.2s;cursor:default;}
        .inv-card:hover{box-shadow:6px 6px 16px rgba(0,0,0,0.8),-2px -2px 8px rgba(255,255,255,0.03),0 0 24px rgba(229,57,53,0.12)!important;transform:translateY(-3px);}
        .chip{transition:all 0.15s;cursor:pointer;}
        .chip:hover{border-color:${T.red}!important;color:${T.red}!important;}
        .icon-btn{transition:all 0.15s;opacity:0.4;background:transparent;border:none;cursor:pointer;font-size:15px;padding:4px;}
        .icon-btn:hover{opacity:1;transform:scale(1.2);}
        .neo-input:focus{border-color:${T.red}!important;box-shadow:${T.neo},0 0 0 3px ${T.redGlow}!important;}
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
            <div style={{ width:4, height:28, background:`linear-gradient(${T.red},${T.redDark})`, borderRadius:4 }} />
            <h1 style={{ fontSize:26, fontWeight:900, color:T.text, letterSpacing:1 }}>מלאי ציוד</h1>
          </div>
          <p style={{ color:T.muted, fontSize:13, paddingRight:16 }}>{items.length} פריטים במלאי</p>
        </div>
        <button className="neo-btn" onClick={() => { setForm(EMPTY); setModal(true) }}
          style={{ padding:'11px 22px', fontSize:14, borderRadius:12 }}>
          + הוסף פריט
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:T.muted, fontSize:14 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש..."
            className="neo-input" style={{ ...inp, paddingRight:36, width:180, background:T.card, boxShadow:T.neo }} />
        </div>
        {[{ id:'all', name:'הכל', icon:'' }, ...cats].map(c => (
          <button key={c.id} className="chip" onClick={() => setCatFilter(c.id)}
            style={{ padding:'7px 14px', borderRadius:20, border:`1px solid`, fontSize:12, fontWeight:600,
              borderColor: catFilter===c.id ? T.red : T.border,
              background:  catFilter===c.id ? T.redGlow : T.card,
              color:       catFilter===c.id ? T.red : T.muted,
              boxShadow:   catFilter===c.id ? `0 0 10px ${T.redGlow}` : T.neoOut }}>
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16 }}>
        {filtered.map((item,i) => (
          <div key={item.id} className="inv-card"
            style={{ background:T.card, borderRadius:16, border:`1px solid ${T.border}`, overflow:'hidden', boxShadow:T.neoOut, animation:`fadeUp 0.3s ease ${i*0.04}s both` }}>

            {/* תמונה */}
            <div style={{ height:150, background:T.surface, overflow:'hidden', position:'relative' }}>
              {item.image_url
                ? <img src={item.image_url} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:6 }}>
                    <span style={{ fontSize:38 }}>{item.equipment_categories?.icon||'📦'}</span>
                    <span style={{ fontSize:10, color:T.border, letterSpacing:1 }}>NO IMAGE</span>
                  </div>
              }
              {/* overlay gradient */}
              <div style={{ position:'absolute', bottom:0, left:0, right:0, height:40, background:'linear-gradient(transparent,rgba(0,0,0,0.7))' }} />
              <span style={{ position:'absolute', top:10, right:10, background:`${COND_COLOR[item.condition]}22`, color:COND_COLOR[item.condition], fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20, border:`1px solid ${COND_COLOR[item.condition]}44`, backdropFilter:'blur(4px)' }}>
                {CONDS[item.condition]}
              </span>
            </div>

            <div style={{ padding:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:T.text }}>{item.name}</div>
                  <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>
                    {item.equipment_categories?.icon} {item.equipment_categories?.name||'—'}
                  </div>
                </div>
                <div style={{ display:'flex', gap:2 }}>
                  <button className="icon-btn" onClick={() => { setForm({...item, category_id:item.category_id||''}); setModal(true) }}>✏️</button>
                  <button className="icon-btn" onClick={() => del(item.id)}>🗑️</button>
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:10, borderTop:`1px solid ${T.border}` }}>
                <span style={{ fontSize:16, fontWeight:800, color:T.red }}>₪{item.daily_rate}<span style={{ fontSize:10, fontWeight:400, color:T.muted }}>/יום</span></span>
                <span style={{ fontSize:11, color:T.muted, background:T.surface, padding:'3px 10px', borderRadius:20, border:`1px solid ${T.border}` }}>×{item.quantity_total}</span>
              </div>
              {item.notes && <div style={{ fontSize:11, color:T.muted, marginTop:8, paddingTop:8, borderTop:`1px solid ${T.border}` }}>{item.notes}</div>}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'80px 0', color:T.muted }}>
          <div style={{ fontSize:48, marginBottom:12, opacity:0.3 }}>📦</div>
          <div style={{ fontSize:14, letterSpacing:1 }}>לא נמצאו פריטים</div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(6px)' }}>
          <div style={{ background:T.surface, borderRadius:20, padding:32, width:440, maxHeight:'90vh', overflowY:'auto', direction:'rtl', boxShadow:`0 24px 60px rgba(0,0,0,0.9), 0 0 40px ${T.redGlow}`, border:`1px solid ${T.border}`, animation:'fadeUp 0.25s ease' }}>

            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
              <div style={{ width:4, height:22, background:`linear-gradient(${T.red},${T.redDark})`, borderRadius:4 }} />
              <h2 style={{ margin:0, fontSize:17, fontWeight:900, color:T.text, letterSpacing:0.5 }}>{form.id ? 'עריכת פריט' : 'פריט חדש'}</h2>
            </div>

            {/* תמונה */}
            <div style={{ marginBottom:16 }}>
              <label style={lbl}>תמונה</label>
              {form.image_url && (
                <div style={{ marginBottom:8, borderRadius:10, overflow:'hidden', height:110, border:`1px solid ${T.border}` }}>
                  <img src={form.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                </div>
              )}
              <div onClick={() => fileRef.current?.click()}
                style={{ border:`2px dashed ${T.border}`, borderRadius:10, padding:'14px', textAlign:'center', cursor:'pointer', background:T.card, transition:'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=T.red; e.currentTarget.style.background=T.redGlow }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.background=T.card }}>
                <span style={{ color:T.muted, fontSize:12, letterSpacing:1 }}>{uploading ? '⏳ מעלה...' : '📷 לחץ להעלאת תמונה'}</span>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
                onChange={e => { const f=e.target.files[0]; if(f) setForm(p=>({...p,image_url:URL.createObjectURL(f)})) }} />
            </div>

            {[
              { label:'שם הפריט *',      key:'name',           type:'text',   placeholder:'לדוגמה: מערכת שמע' },
              { label:'מחיר יומי (₪) *', key:'daily_rate',    type:'number', placeholder:'0' },
              { label:'כמות במלאי *',    key:'quantity_total', type:'number', placeholder:'0' },
              { label:'תיאור',           key:'description',    type:'text',   placeholder:'תיאור קצר...' },
              { label:'הערות',           key:'notes',          type:'text',   placeholder:'הערות פנימיות...' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:14 }}>
                <label style={lbl}>{f.label}</label>
                <input type={f.type} value={form[f.key]||''} placeholder={f.placeholder}
                  className="neo-input"
                  onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))}
                  style={{ ...inp, background:T.card, boxShadow:T.neo }}
                  onFocus={e => e.target.style.borderColor=T.red}
                  onBlur={e => e.target.style.borderColor=T.border} />
              </div>
            ))}

            {[
              { label:'קטגוריה', key:'category_id', opts: [{ id:'', name:'-- בחר קטגוריה --' }, ...cats.map(c=>({id:c.id, name:`${c.icon} ${c.name}`}))] },
              { label:'מצב',     key:'condition',   opts: Object.entries(CONDS).map(([k,v])=>({id:k,name:v})) },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:14 }}>
                <label style={lbl}>{f.label}</label>
                <select value={form[f.key]||''} onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))}
                  style={{ ...inp, background:T.card, boxShadow:T.neo }}>
                  {f.opts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            ))}

            <div style={{ display:'flex', gap:10, marginTop:24 }}>
              <button className="neo-btn" onClick={save} disabled={saving||uploading}
                style={{ flex:1, padding:'13px', fontSize:15, borderRadius:12 }}>
                {saving ? 'שומר...' : uploading ? 'מעלה...' : 'שמור'}
              </button>
              <button onClick={() => setModal(false)}
                style={{ flex:1, background:T.card, border:`1px solid ${T.border}`, color:T.muted, fontWeight:600, padding:'13px', borderRadius:12, cursor:'pointer', fontSize:15, boxShadow:T.neoOut, transition:'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor=T.red}
                onMouseLeave={e => e.currentTarget.style.borderColor=T.border}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}