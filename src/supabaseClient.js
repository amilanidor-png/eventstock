import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://jeaizwuqxclvayfdbtcn.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplYWl6d3VxeGNsdmF5ZmRidGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTE3ODYsImV4cCI6MjA5NTM4Nzc4Nn0.Vtpq8pZ5o1SgIaaKVTtTRUgsu3hyIRQHYUccT8rl35c'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

function show(msg, color) {
  const div = document.createElement('div')
  div.style.cssText = `position:fixed;top:0;left:0;right:0;background:${color};color:#fff;padding:10px;font-size:13px;z-index:99999;direction:ltr;`
  div.textContent = msg
  document.body.appendChild(div)
}

show('TESTING CONNECTION...', 'blue')
const start = Date.now()
supabase.from('profiles').select('id').limit(1)
  .then(r => show('OK in ' + (Date.now()-start) + 'ms: ' + JSON.stringify(r.error || 'success'), 'green'))
  .catch(e => show('FAILED: ' + e.message, 'red'))