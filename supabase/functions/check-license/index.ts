import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
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
    const body = await req.json()
    const raw = body.driver_id

    if (!raw || typeof raw !== 'string') {
      return new Response(JSON.stringify({ error: 'Driver ID is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const driverId = raw.trim().toUpperCase()

    // Validate format: D followed by 7 digits
    if (!/^D\d{7}$/.test(driverId)) {
      return new Response(JSON.stringify({ error: 'Invalid Driver ID format.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data, error } = await supabase
      .from('drivers')
      .select('full_name, dob, platform, day, timeslot, payroll, paymaster, status')
      .eq('driver_id', driverId)
      .single()

    if (error || !data) {
      return new Response(JSON.stringify({ eligible: false, error: 'Driver ID not found in the system.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (data.status !== 'eligible') {
      return new Response(JSON.stringify({
        eligible: false,
        reason: 'Your Driver ID is not eligible.',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      eligible: true,
      full_name: data.full_name,
      dob: data.dob,
      platform: data.platform,
      day: data.day,
      timeslot: data.timeslot,
      payroll: data.payroll,
      paymaster: data.paymaster
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