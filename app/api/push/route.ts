import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const VAPID_PUBLIC_KEY = 'BDWkbD2GAEBQVdCN67tEFwOQPN2qXYjIceEeLEd4YyA-ETafSlTLQPVC_cB4f68kuZPJPjxnDBriPmhELsvm4Mw'
const VAPID_PRIVATE_KEY = 'ro8XOQ6rpEs79jacD6pUCXtQRySd2X3YhRgM2SOVgCk'

webpush.setVapidDetails(
  'mailto:noreply@tax-calculator.app',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

export async function POST(req: NextRequest) {
  try {
    const { receiver_id } = await req.json()
    if (!receiver_id) {
      return NextResponse.json({ error: 'receiver_id required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', receiver_id)

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No subscriptions' })
    }

    const payload = JSON.stringify({
      title: '税金計算をしませんか？',
      body: '最新の税制情報で手取りをチェック',
    })

    const results = []
    for (const sub of subscriptions) {
      try {
        const result = await webpush.sendNotification(sub.subscription, payload)
        results.push({ status: result.statusCode, ok: true })
      } catch (e: any) {
        results.push({ status: e.statusCode, message: e.body || e.message, ok: false })
        if (e.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', receiver_id)
            .eq('subscription', sub.subscription)
        }
      }
    }

    return NextResponse.json({ message: 'Sent', results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
