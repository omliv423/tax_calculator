'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AddFriendPage() {
  const [session, setSession] = useState<any>(null)
  const [username, setUsername] = useState('')
  const [result, setResult] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setSession(session)
    })
  }, [])

  const searchUser = async () => {
    setLoading(true)
    setMessage('')
    setResult(null)

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

    if (!data) {
      setMessage('ユーザーが見つかりませんでした')
    } else if (data.id === session.user.id) {
      setMessage('自分自身は追加できません')
    } else {
      setResult(data)
    }
    setLoading(false)
  }

  const addFriend = async () => {
    if (!result) return
    setLoading(true)

    // 双方向で追加
    await supabase.from('friendships').upsert([
      { user_id: session.user.id, friend_id: result.id },
      { user_id: result.id, friend_id: session.user.id },
    ])

    setMessage(`${result.username} を追加しました`)
    setResult(null)
    setUsername('')
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/chat')} className="text-gray-400 text-lg">←</button>
        <h2 className="text-lg font-bold text-gray-800">フレンドを追加</h2>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
        <input
          type="text"
          placeholder="ユーザー名を入力"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-400"
        />
        <button
          onClick={searchUser}
          disabled={loading || !username}
          className="w-full bg-gray-800 text-white rounded-xl py-3 font-medium active:opacity-70 disabled:opacity-40"
        >
          検索する
        </button>
      </div>

      {message && (
        <p className="text-center text-sm text-gray-400 mt-4">{message}</p>
      )}

      {result && (
        <div className="mt-4 bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
              {result.username[0].toUpperCase()}
            </div>
            <span className="font-medium text-gray-800">{result.username}</span>
          </div>
          <button
            onClick={addFriend}
            disabled={loading}
            className="bg-gray-800 text-white rounded-xl px-4 py-2 text-sm active:opacity-70 disabled:opacity-40"
          >
            追加
          </button>
        </div>
      )}
    </main>
  )
}
