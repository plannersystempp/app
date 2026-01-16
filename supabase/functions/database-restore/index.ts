import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Authorization header required' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 })
    }

    const { fileKey, format } = await req.json()
    if (!fileKey || !format) {
      return new Response(JSON.stringify({ success: false, error: 'Parâmetros inválidos' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(JSON.stringify({ success: false, error: 'Missing environment variables' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } })
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 })
    }

    const { data: isSuperAdmin, error: superAdminError } = await supabaseClient.rpc('is_super_admin')
    if (superAdminError || !isSuperAdmin) {
      return new Response(JSON.stringify({ success: false, error: 'Acesso negado' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 })
    }

    const bucketName = 'backups'
    const ensureBucket = await serviceClient.storage.getBucket(bucketName)
    if (!ensureBucket.data) {
      await serviceClient.storage.createBucket(bucketName, { public: false })
    }

    const fileResp = await serviceClient.storage.from(bucketName).download(fileKey)
    if (fileResp.error || !fileResp.data) {
      return new Response(JSON.stringify({ success: false, error: 'Arquivo de backup não encontrado' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 })
    }

    const decompressed = await new Response((fileResp.data as Blob).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
    const text = new TextDecoder().decode(new Uint8Array(decompressed))

    if (format === 'json') {
      const parsed = JSON.parse(text)
      const data = parsed?.data || {}
      for (const [table, payload] of Object.entries<any>(data)) {
        const rows = payload?.data || []
        if (!Array.isArray(rows) || rows.length === 0) continue
        const hasId = 'id' in rows[0]
        if (hasId) {
          await serviceClient.from(table).upsert(rows, { onConflict: 'id' })
        } else {
          await serviceClient.from(table).insert(rows)
        }
      }
    } else if (format === 'sql') {
      const lines = text.split(/;\s*\n/).filter(l => l.trim().length)
      for (const line of lines) {
        const m = line.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i)
        if (!m) continue
        const table = m[1]
        const cols = m[2].split(',').map(s=>s.trim().replace(/"/g,''))
        const valsRaw = m[3].split(',')
        const vals = parseSqlValues(valsRaw)
        const row: Record<string, any> = {}
        cols.forEach((c,i)=> row[c] = vals[i])
        const hasId = 'id' in row
        if (hasId) {
          await serviceClient.from(table).upsert(row, { onConflict: 'id' })
        } else {
          await serviceClient.from(table).insert(row)
        }
      }
    } else {
      return new Response(JSON.stringify({ success: false, error: 'Formato inválido' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }

    await serviceClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'database_restore',
      table_name: 'database',
      new_values: { fileKey, format },
      created_at: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message || 'Erro na restauração' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})

function parseSqlValues(parts: string[]): any[] {
  const out: any[] = []
  let buffer = ''
  let inString = false
  for (let i=0;i<parts.length;i++) {
    const p = parts[i]
    if (inString) {
      buffer += ',' + p
      if (/\'$/.test(p.trim()) || /\'\s*$/.test(p)) inString = false
      if (!inString) out.push(fromSqlValue(buffer.trim()))
    } else {
      const trimmed = p.trim()
      if (trimmed.startsWith("'") && !trimmed.endsWith("'")) {
        inString = true
        buffer = trimmed
      } else {
        out.push(fromSqlValue(trimmed))
      }
    }
  }
  if (inString) out.push(fromSqlValue(buffer.trim()))
  return out
}

function fromSqlValue(token: string): any {
  if (/^NULL$/i.test(token)) return null
  if (/^(TRUE|FALSE)$/i.test(token)) return /^TRUE$/i.test(token)
  if (/^'.*'$/.test(token)) {
    const inner = token.slice(1, -1).replace(/''/g, "'")
    try {
      const obj = JSON.parse(inner)
      return obj
    } catch {
      return inner
    }
  }
  const n = Number(token)
  if (!Number.isNaN(n)) return n
  return token
}
