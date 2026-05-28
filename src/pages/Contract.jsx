import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Contract() {
  const { id }                    = useParams()
  const [contract, setContract]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [signing, setSigning]     = useState(false)
  const [signed, setSigned]       = useState(false)
  const [name, setName]           = useState('')
  const [drawing, setDrawing]     = useState(false)
  const canvasRef                 = useRef(null)
  const lastPos                   = useRef(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('contracts').select('*').eq('id', id).single()
      setContract(data)
      if (data?.signed_at) setSigned(true)
      setLoading(false)
    }
    load()
  }, [id])

  // ציור חתימה
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const src  = e.touches ? e.touches[0] : e
    return { x: src.clientX - rect.left, y: src.clientY - rect.top }
  }

  const startDraw = (e) => {
    e.preventDefault()
    setDrawing(true)
    const canvas = canvasRef.current
    lastPos.current = getPos(e, canvas)
  }

  const draw = (e) => {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const pos    = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth   = 2.5
    ctx.lineCap     = 'round'
    ctx.stroke()
    lastPos.current = pos
  }

  const stopDraw = () => setDrawing(false)

  const clearCanvas = () => {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
  }

  const isCanvasEmpty = () => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const data   = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    return !data.some(v => v !== 0)
  }

  const handleSign = async () => {
    if (!name.trim()) return alert('נא להזין שם מלא')
    if (isCanvasEmpty())  return alert('נא לחתום בתיבת החתימה')
    setSigning(true)
    const signature_data = canvasRef.current.toDataURL('image/png')
    await supabase.from('contracts').update({
      signed_at:      new Date().toISOString(),
      signature_data,
      signed_by_name: name,
    }).eq('id', id)
    setSigned(true)
    setSigning(false)
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#f8f9fb' }}>
      <div style={{ width:32, height:32, border:'3px solid #e2e8f0', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  )

  if (!contract) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#f8f9fb', direction:'rtl' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>❌</div>
        <div style={{ fontSize:18, fontWeight:700, color:'#1e293b' }}>חוזה לא נמצא</div>
      </div>
    </div>
  )

  if (signed) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f8f9fb', direction:'rtl' }}>
      <div style={{ textAlign:'center', padding:40 }}>
        <div style={{ fontSize:64, marginBottom:16 }}>✅</div>
        <div style={{ fontSize:22, fontWeight:800, color:'#10b981', marginBottom:8 }}>החוזה נחתם בהצלחה!</div>
        <div style={{ fontSize:14, color:'#94a3b8' }}>תודה, {contract.signed_by_name || name}</div>
        <div style={{ fontSize:13, color:'#94a3b8', marginTop:4 }}>
          {new Date(contract.signed_at || Date.now()).toLocaleDateString('he-IL', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#f8f9fb', direction:'rtl', fontFamily:'"Inter","Segoe UI",sans-serif' }}>
      <style>{`@keyframes spin { to { transform:rotate(360deg) } } @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', padding:'24px 32px', color:'#fff' }}>
        <div style={{ maxWidth:700, margin:'0 auto', display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:28 }}>🏔️</span>
          <div>
            <div style={{ fontSize:18, fontWeight:800 }}>אוורסט — השכרת ציוד אירועים</div>
            <div style={{ fontSize:13, opacity:0.8 }}>חוזה השכרה דיגיטלי</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:700, margin:'0 auto', padding:'32px 20px' }}>
        {/* תוכן החוזה */}
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', padding:32, marginBottom:24, animation:'fadeUp 0.3s ease' }}>
          <div dangerouslySetInnerHTML={{ __html: contract.content_html }} />
        </div>

        {/* חתימה */}
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', padding:32, animation:'fadeUp 0.3s ease 0.1s both' }}>
          <h3 style={{ margin:'0 0 20px', fontSize:17, fontWeight:800, color:'#0f172a' }}>✍️ חתימה דיגיטלית</h3>

          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>שם מלא *</label>
            <input type="text" placeholder="הזן את שמך המלא" value={name} onChange={e => setName(e.target.value)}
              style={{ width:'100%', background:'#f8fafc', border:'1px solid #e2e8f0', color:'#1e293b', borderRadius:10, padding:'10px 14px', fontSize:14, outline:'none', boxSizing:'border-box' }}
              onFocus={e => e.target.style.borderColor='#6366f1'}
              onBlur={e => e.target.style.borderColor='#e2e8f0'} />
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <label style={{ fontSize:13, fontWeight:600, color:'#374151' }}>חתימה *</label>
              <button onClick={clearCanvas}
                style={{ background:'transparent', border:'none', color:'#94a3b8', fontSize:12, cursor:'pointer', textDecoration:'underline' }}>
                נקה
              </button>
            </div>
            <canvas ref={canvasRef} width={600} height={150}
              style={{ width:'100%', height:150, border:'2px dashed #e2e8f0', borderRadius:10, background:'#f8fafc', cursor:'crosshair', touchAction:'none' }}
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:4, textAlign:'center' }}>חתום כאן עם האצבע או העכבר</div>
          </div>

          <button onClick={handleSign} disabled={signing}
            style={{ width:'100%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontWeight:700, padding:'14px', borderRadius:12, cursor:'pointer', fontSize:16, marginTop:8, transition:'all 0.2s', boxShadow:'0 4px 12px rgba(99,102,241,0.25)' }}>
            {signing ? '⏳ שולח...' : '✅ אני מאשר ומסכים לתנאי החוזה'}
          </button>

          <div style={{ fontSize:11, color:'#94a3b8', textAlign:'center', marginTop:12 }}>
            בלחיצה על הכפתור אתה מאשר שקראת והסכמת לכל תנאי החוזה
          </div>
        </div>
      </div>
    </div>
  )
}