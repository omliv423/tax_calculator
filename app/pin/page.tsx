'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CORRECT_PIN = '1234' // ← あとで好きな数字に変えてください

export default function PinPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const router = useRouter()

  const handleInput = (num: string) => {
    if (pin.length >= 4) return
    const newPin = pin + num
    setPin(newPin)
    setError(false)

    if (newPin.length === 4) {
      if (newPin === CORRECT_PIN) {
        router.push('/auth')
      } else {
        setTimeout(() => {
          setPin('')
          setError(true)
        }, 500)
      }
    }
  }

  const handleDelete = () => {
    setPin(pin.slice(0, -1))
    setError(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <h2 className="text-lg font-bold text-gray-800">PINを入力</h2>
        <p className="text-sm text-gray-400 mt-1">4桁のコードを入力してください</p>
      </div>

      {/* ドット表示 */}
      <div className="flex gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all ${
              pin.length > i
                ? error
                  ? 'bg-red-400 border-red-400'
                  : 'bg-gray-800 border-gray-800'
                : 'border-gray-300'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-sm mb-6">PINが違います</p>
      )}

      {/* テンキー */}
      <div className="grid grid-cols-3 gap-4 w-64">
        {['1','2','3','4','5','6','7','8','9'].map((n) => (
          <button
            key={n}
            onClick={() => handleInput(n)}
            className="h-16 rounded-2xl bg-white shadow-sm text-xl font-medium text-gray-800 active:bg-gray-100"
          >
            {n}
          </button>
        ))}
        <div /> {/* 空白 */}
        <button
          onClick={() => handleInput('0')}
          className="h-16 rounded-2xl bg-white shadow-sm text-xl font-medium text-gray-800 active:bg-gray-100"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="h-16 rounded-2xl bg-white shadow-sm text-xl font-medium text-gray-500 active:bg-gray-100"
        >
          ←
        </button>
      </div>
    </main>
  )
}
