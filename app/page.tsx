'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [income, setIncome] = useState('')
  const [result, setResult] = useState<null | {
    income: number
    tax: number
    insurance: number
    takehome: number
  }>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const tapCount = useRef(0)
  const tapTimer = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  // 起動時に最終更新時刻を取得
  useState(() => {
    const fetchLastActivity = async () => {
      const { data } = await supabase
        .from('last_activity')
        .select('updated_at')
        .single()
      if (data) {
        setLastUpdated(
          new Date(data.updated_at).toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
        )
      }
    }
    fetchLastActivity()
  })

  const calculateTax = () => {
    // 隠しアクション：5回タップで遷移
    tapCount.current += 1
    if (tapTimer.current) clearTimeout(tapTimer.current)
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0
    }, 2000)

    if (tapCount.current >= 5) {
      tapCount.current = 0
      router.push('/pin')
      return
    }

    // 通常の計算処理
    const incomeNum = parseInt(income.replace(/,/g, ''))
    if (isNaN(incomeNum) || incomeNum <= 0) return

    const taxableIncome = incomeNum - 480000
    let tax = 0
    if (taxableIncome <= 1950000) tax = taxableIncome * 0.05
    else if (taxableIncome <= 3300000) tax = taxableIncome * 0.1 - 97500
    else if (taxableIncome <= 6950000) tax = taxableIncome * 0.2 - 427500
    else if (taxableIncome <= 9000000) tax = taxableIncome * 0.23 - 636000
    else tax = taxableIncome * 0.33 - 1536000

    const insurance = incomeNum * 0.15
    const takehome = incomeNum - tax - insurance

    setResult({
      income: incomeNum,
      tax: Math.round(tax),
      insurance: Math.round(insurance),
      takehome: Math.round(takehome),
    })
  }

  const formatNum = (n: number) => n.toLocaleString('ja-JP')

  return (
    <main className="min-h-screen bg-gray-50 p-6 max-w-md mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-800">年収手取りシミュレーター</h1>
        <p className="text-xs text-gray-400 mt-1">最終更新：{lastUpdated ?? '取得中...'}</p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <label className="block text-sm text-gray-600 mb-2">年収（万円）</label>
        <input
          type="number"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
          placeholder="例：500"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-gray-400"
        />
        <button
          onClick={calculateTax}
          className="w-full mt-4 bg-gray-800 text-white rounded-xl py-3 font-medium active:opacity-70"
        >
          計算する
        </button>
      </div>

      {result && (
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">年収</span>
            <span className="font-medium">{formatNum(result.income * 10000)}円</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">所得税（概算）</span>
            <span className="text-red-500">-{formatNum(result.tax * 10000)}円</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">社会保険料（概算）</span>
            <span className="text-red-500">-{formatNum(result.insurance * 10000)}円</span>
          </div>
          <div className="border-t pt-3 flex justify-between">
            <span className="font-bold text-gray-800">手取り（概算）</span>
            <span className="font-bold text-blue-600">{formatNum(result.takehome * 10000)}円</span>
          </div>
          <p className="text-xs text-gray-400">※概算です。詳細は税理士にご相談ください。</p>
        </div>
      )}
    </main>
  )
}
