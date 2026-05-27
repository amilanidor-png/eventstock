import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://jeaizwuqxclvayfdbtcn.supabase.co'
const SUPABASE_ANON = 'sb_publishable_VB7UkCFK2q2yXdBIEoKKXA_VVmdo2ax'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)