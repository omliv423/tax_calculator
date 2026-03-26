'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { navigateTo } from '@/lib/navigate'

export default function ProfilePage() {
  const [session, setSession] = useState<any>(null)
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigateTo(router, '/auth'); return }
      setSession(session)
      fetchProfile(session.user.id)
    })
  }, [])

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .single()
    if (data) {
      setUsername(data.username || '')
      setAvatarUrl(data.avatar_url)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !session) return
    setUploading(true)

    const filename = `${session.user.id}_${Date.now()}`
    const { error } = await supabase.storage
      .from('avatars')
      .upload(filename, file, { upsert: true })

    if (error) {
      setMessage('画像のアップロードに失敗しました')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filename)

    await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', session.user.id)

    setAvatarUrl(publicUrl)
    setMessage('アイコンを更新しました')
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSave = async () => {
    if (!session || !username.trim()) return
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ username: username.trim() })
      .eq('id', session.user.id)
    setMessage('保存しました')
    setSaving(false)
  }

  return (
    <main className="h-full bg-gray-50 flex flex-col overflow-y-auto">
      <div className="bg-white px-4 pt-[env(safe-area-inset-top,12px)] pb-3 flex items-center gap-3 border-b border-gray-100">
        <button
          onClick={() => navigateTo(router, '/chat')}
          className="text-gray-400 text-xl w-8"
        >
          ‹
        </button>
        <h2 className="text-lg font-bold text-gray-900">プロフィール</h2>
      </div>

      <div className="p-4 space-y-6">
        {/* アバター */}
        <div className="flex flex-col items-center gap-3">
          <div
            onClick={() => fileRef.current?.click()}
            className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer active:opacity-70"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="アバター" className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-500 text-3xl font-bold">
                {username ? username[0].toUpperCase() : '?'}
              </span>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="text-sm text-gray-500 border border-gray-200 rounded-full px-4 py-1 active:bg-gray-50 disabled:opacity-40"
          >
            {uploading ? 'アップロード中...' : 'アイコンを変更'}
          </button>
          <input
            type="file"
            accept="image/*"
            ref={fileRef}
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>

        {/* ユーザー名 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <label className="block text-sm text-gray-600">ユーザー名</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:border-gray-400"
          />
          <button
            onClick={handleSave}
            disabled={saving || !username.trim()}
            className="w-full bg-gray-900 text-white rounded-xl py-2.5 font-medium active:opacity-70 disabled:opacity-40 text-sm"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>

        {message && (
          <p className="text-center text-sm text-gray-400">{message}</p>
        )}
      </div>
    </main>
  )
}
