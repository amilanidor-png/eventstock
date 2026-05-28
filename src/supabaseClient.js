import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://jeaizwuqxclvayfdbtcn.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplYWl6d3VxeGNsdmF5ZmRidGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTE3ODYsImV4cCI6MjA5NTM4Nzc4Nn0.Vtpq8pZ5o1SgIaaKVTtTRUgsu3hyIRQHYUccT8rl35c'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)