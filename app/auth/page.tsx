'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { navigateTo } from '@/lib/navigate'

export default function AuthPage() {
  const router = useRouter()

  // 既にログイン済みならチャットへ直行
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigateTo(router, '/chat')
    })
  }, [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    setLoading(true)
    setError('')

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }

      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          username,
        })
      }
      navigateTo(router, '/chat')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError('メールアドレスまたはパスワードが違います'); setLoading(false); return }
      navigateTo(router, '/chat')
    }
    setLoading(false)
  }

  return (
    <main className="h-full bg-gray-50 flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-800 text-center">
          {isSignUp ? 'アカウント作成' : 'ログイン'}
        </h2>

        {isSignUp && (
          <input
            type="text"
            placeholder="ユーザー名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-400"
          />
        )}

        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-400"
        />

        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-400"
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-gray-800 text-white rounded-xl py-3 font-medium active:opacity-70 disabled:opacity-40"
        >
          {loading ? '処理中...' : isSignUp ? '登録する' : 'ログイン'}
        </button>

        <button
          onClick={() => { setIsSignUp(!isSignUp); setError('') }}
          className="w-full text-sm text-blue-500 text-center"
        >
          {isSignUp ? 'ログインはこちら' : 'アカウントを作成する'}
        </button>
      </div>
    </main>
  )
}
