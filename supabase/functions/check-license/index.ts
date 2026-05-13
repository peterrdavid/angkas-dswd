import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://peterrdavid.github.io', // Restrict to your GitHub Pages URL in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { license } = await req.json()

    // Sanitize input
    if (!license || typeof license !== 'string') {
      return new Response(JSON.stringify({ error: 'License number is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const sanitized = license.trim().toUpperCase().replace(/[^A-Z0-9\-]/g, '')

    if (!sanitized) {
      return new Response(JSON.stringify({ error: 'Invalid license number format.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Init Supabase client using environment variables (set in Supabase dashboard)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Query the drivers table
    const { data, error } = await supabase
      .from('drivers')
      .select('license_number, status, instructions')
      .eq('license_number', sanitized)
      .single()

    if (error || !data) {
      return new Response(JSON.stringify({ eligible: false, error: 'License number not found in the system.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (data.status !== 'eligible') {
      return new Response(JSON.stringify({
        eligible: false,
        reason: 'Your license is currently not eligible.',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Return only what's needed — no extra PII
    return new Response(JSON.stringify({
      eligible: true,
      instructions: data.instructions,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})