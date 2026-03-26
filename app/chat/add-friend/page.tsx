'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { navigateTo } from '@/lib/navigate'

export default function AddFriendPage() {
  const [session, setSession] = useState<any>(null)
  const [username, setUsername] = useState('')
  const [result, setResult] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigateTo(router, '/auth'); return }
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
    <main className="h-full bg-gray-50 flex flex-col overflow-y-auto">
      {/* ヘッダー */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button
          onClick={() => navigateTo(router, '/chat')}
          className="text-gray-400 text-xl w-8"
        >
          ‹
        </button>
        <h2 className="text-lg font-bold text-gray-900">フレンドを追加</h2>
      </div>

      {/* 検索エリア */}
      <div className="px-4 pt-6 pb-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="ユーザー名を入力"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && username && searchUser()}
            className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
          />
          <button
            onClick={searchUser}
            disabled={loading || !username}
            className="bg-gray-900 text-white rounded-full px-5 py-3 text-sm font-medium active:opacity-70 disabled:opacity-40 flex-shrink-0"
          >
            検索
          </button>
        </div>

        {message && (
          <p className="text-center text-sm text-gray-400">{message}</p>
        )}
      </div>

      {/* 検索結果 */}
      {result && (
        <div className="px-4">
          <div className="bg-white rounded-2xl px-4 py-4 flex items-center justify-between border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-lg flex-shrink-0">
                {result.username[0].toUpperCase()}
              </div>
              <span className="font-medium text-gray-900">{result.username}</span>
            </div>
            <button
              onClick={addFriend}
              disabled={loading}
              className="bg-gray-900 text-white rounded-full px-4 py-2 text-sm font-medium active:opacity-70 disabled:opacity-40"
            >
              追加
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
