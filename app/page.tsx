'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { navigateTo } from '@/lib/navigate'

export default function Home() {
  const [income, setIncome] = useState('')
  const [result, setResult] = useState<null | {
    income: number
    socialInsurance: number
    incomeTax: number
    residentTax: number
    takehome: number
    furusatoLimit: number
  }>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const tapCount = useRef(0)
  const tapTimer = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

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

  // 給与所得控除
  const calcSalaryDeduction = (annual: number): number => {
    if (annual <= 1625000) return 550000
    if (annual <= 1800000) return annual * 0.4 - 100000
    if (annual <= 3600000) return annual * 0.3 + 80000
    if (annual <= 6600000) return annual * 0.2 + 440000
    if (annual <= 8500000) return annual * 0.1 + 1100000
    return 1950000
  }

  // 社会保険料（概算・40歳未満想定）
  const calcSocialInsurance = (annual: number): number => {
    const monthly = annual / 12
    const healthInsurance = Math.min(monthly, 1390000) * 0.05
    const pension = Math.min(monthly, 650000) * 0.0915
    const employment = monthly * 0.0055
    return Math.round((healthInsurance + pension + employment) * 12)
  }

  // 所得税の限界税率を取得
  const getIncomeTaxRate = (taxableIncome: number): number => {
    if (taxableIncome <= 0) return 0
    if (taxableIncome <= 1949000) return 0.05
    if (taxableIncome <= 3299000) return 0.10
    if (taxableIncome <= 6949000) return 0.20
    if (taxableIncome <= 8999000) return 0.23
    if (taxableIncome <= 17999000) return 0.33
    if (taxableIncome <= 39999000) return 0.40
    return 0.45
  }

  // 所得税（復興特別所得税込み）
  const calcIncomeTax = (taxableIncome: number): number => {
    if (taxableIncome <= 0) return 0
    let tax = 0
    if (taxableIncome <= 1949000) tax = taxableIncome * 0.05
    else if (taxableIncome <= 3299000) tax = taxableIncome * 0.1 - 97500
    else if (taxableIncome <= 6949000) tax = taxableIncome * 0.2 - 427500
    else if (taxableIncome <= 8999000) tax = taxableIncome * 0.23 - 636000
    else if (taxableIncome <= 17999000) tax = taxableIncome * 0.33 - 1536000
    else if (taxableIncome <= 39999000) tax = taxableIncome * 0.4 - 2796000
    else tax = taxableIncome * 0.45 - 4796000
    return Math.round(tax * 1.021)
  }

  // 基礎控除（所得税用）
  const calcBasicDeduction = (totalIncome: number): number => {
    if (totalIncome <= 24000000) return 480000
    if (totalIncome <= 24500000) return 320000
    if (totalIncome <= 25000000) return 160000
    return 0
  }

  // ふるさと納税上限額
  const calcFurusatoLimit = (
    residentTaxableIncome: number,
    incomeTaxRate: number
  ): number => {
    const residentTaxIncome = Math.round(residentTaxableIncome * 0.1)
    if (residentTaxIncome <= 0) return 2000
    const denominator = 1 - 0.1 - incomeTaxRate * 1.021
    if (denominator <= 0) return 2000
    return Math.floor(residentTaxIncome * 0.2 / denominator) + 2000
  }

  const calculateTax = () => {
    tapCount.current += 1
    if (tapTimer.current) clearTimeout(tapTimer.current)
    tapTimer.current = setTimeout(() => { tapCount.current = 0 }, 2000)
    if (tapCount.current >= 5) {
      tapCount.current = 0
      navigateTo(router, '/pin')
      return
    }

    const incomeMan = parseInt(income.replace(/,/g, ''))
    if (isNaN(incomeMan) || incomeMan <= 0) return
    const annual = incomeMan * 10000

    const salaryDeduction = calcSalaryDeduction(annual)
    const salaryIncome = annual - salaryDeduction
    const socialInsurance = calcSocialInsurance(annual)

    // 所得税
    const basicDeduction = calcBasicDeduction(salaryIncome)
    const taxableIncome = Math.max(0, salaryIncome - socialInsurance - basicDeduction)
    const incomeTax = calcIncomeTax(taxableIncome)
    const incomeTaxRate = getIncomeTaxRate(taxableIncome)

    // 住民税
    const basicDeductionResident = salaryIncome <= 24000000 ? 430000 : 0
    const taxableIncomeResident = Math.max(0, salaryIncome - socialInsurance - basicDeductionResident)
    const residentTax = Math.round(taxableIncomeResident * 0.1) + 5000

    // ふるさと納税上限
    const furusatoLimit = calcFurusatoLimit(taxableIncomeResident, incomeTaxRate)

    const takehome = annual - socialInsurance - incomeTax - residentTax

    setResult({
      income: annual,
      socialInsurance,
      incomeTax,
      residentTax,
      takehome,
      furusatoLimit,
    })
  }

  const fmt = (n: number) => n.toLocaleString('ja-JP')

  return (
    <main className="min-h-screen bg-gray-50 pt-4 pb-6 px-4 overflow-y-auto h-full">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-gray-800">年収手取りシミュレーター</h1>
        <p className="text-xs text-gray-400 mt-0.5">最終更新：{lastUpdated ?? '取得中...'}</p>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
        <label className="block text-sm text-gray-600 mb-1.5">年収（万円）</label>
        <input
          type="number"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
          placeholder="例：500"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-lg focus:outline-none focus:border-gray-400"
        />
        <button
          onClick={calculateTax}
          className="w-full mt-3 bg-gray-800 text-white rounded-xl py-2.5 font-medium active:opacity-70"
        >
          計算する
        </button>
      </div>

      {result && (
        <>
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2 mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">年収</span>
              <span className="font-medium">{fmt(result.income)}円</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">社会保険料</span>
              <span className="text-red-500">-{fmt(result.socialInsurance)}円</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">所得税（復興税込）</span>
              <span className="text-red-500">-{fmt(result.incomeTax)}円</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">住民税</span>
              <span className="text-red-500">-{fmt(result.residentTax)}円</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-bold text-gray-800">手取り</span>
              <span className="font-bold text-blue-600">{fmt(result.takehome)}円</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">月収（手取り）</span>
              <span className="font-medium">{fmt(Math.round(result.takehome / 12))}円</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-800">ふるさと納税 上限目安</span>
              <span className="text-lg font-bold text-green-600">{fmt(result.furusatoLimit)}円</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">自己負担2,000円で寄附できる上限額</p>
          </div>

          <p className="text-xs text-gray-400 mt-3 px-1 leading-relaxed">
            ※独身・扶養なし・40歳未満の概算です。社会保険料上限・復興特別所得税を反映。
          </p>
        </>
      )}
    </main>
  )
}
