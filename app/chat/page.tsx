'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const IMAGE_EXPIRE_SECONDS = 10

export default function ChatPage() {
  const [session, setSession] = useState<any>(null)
  const [friends, setFriends] = useState<any[]>([])
  const [selectedFriend, setSelectedFriend] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setSession(session)
      fetchFriends(session.user.id)
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchFriends = async (userId: string) => {
    const { data } = await supabase
      .from('friendships')
      .select('friend_id, profiles!friendships_friend_id_fkey(id, username)')
      .eq('user_id', userId)
    if (data) setFriends(data.map((d: any) => d.profiles))
  }

  const fetchMessages = async (friendId: string) => {
    const userId = session.user.id
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`
      )
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  useEffect(() => {
    if (!selectedFriend || !session) return
    fetchMessages(selectedFriend.id)

    const channel = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new])
        supabase.from('last_activity').update({ updated_at: new Date().toISOString() }).eq('id', 1)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedFriend])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedFriend) return
    setUploading(true)

    const filename = `${Date.now()}_${file.name}`
    const { error } = await supabase.storage
      .from('chat-images')
      .upload(filename, file)

    if (error) { setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage
      .from('chat-images')
      .getPublicUrl(filename)

    const expiresAt = new Date(Date.now() + IMAGE_EXPIRE_SECONDS * 1000).toISOString()

    await supabase.from('messages').insert({
      sender_id: session.user.id,
      receiver_id: selectedFriend.id,
      image_url: publicUrl,
      expires_at: expiresAt,
    })

    setUploading(false)
  }

  const isExpired = (msg: any) => new Date(msg.expires_at) < new Date()
  const isMine = (msg: any) => msg.sender_id === session?.user.id

  // トーク一覧
  if (!selectedFriend) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white px-4 py-4 flex justify-between items-center border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">トーク</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/chat/add-friend')}
              className="text-sm text-gray-500 border border-gray-200 rounded-full px-3 py-1"
            >
              ＋ 追加
            </button>
            <button
              onClick={() => supabase.auth.signOut().then(() => router.push('/auth'))}
              className="text-sm text-gray-400"
            >
              ログアウト
            </button>
          </div>
        </div>

        {/* フレンド一覧 */}
        <div className="flex-1">
          {friends.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-gray-400 text-sm">フレンドがまだいません</p>
            </div>
          ) : (
            <div>
              {friends.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFriend(f)}
                  className="w-full bg-white px-4 py-4 flex items-center gap-3 border-b border-gray-100 active:bg-gray-50"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-lg flex-shrink-0">
                    {f.username[0].toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-900">{f.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    )
  }

  // チャット画面
  return (
    <main className="h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-100 flex-shrink-0">
        <button
          onClick={() => setSelectedFriend(null)}
          className="text-gray-400 text-xl w-8"
        >
          ‹
        </button>
        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
          {selectedFriend.username[0].toUpperCase()}
        </div>
        <span className="font-medium text-gray-900">{selectedFriend.username}</span>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${isMine(msg) ? 'justify-end' : 'justify-start'}`}>
            {isExpired(msg) ? (
              <div className={`rounded-2xl px-4 py-2 text-xs text-gray-400 bg-gray-200`}>
                画像の表示期限が切れました
              </div>
            ) : (
              <img
                src={msg.image_url}
                alt="画像"
                className="max-w-[70vw] max-h-72 rounded-2xl object-cover shadow-sm"
              />
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 送信エリア */}
      <div className="bg-white px-4 py-3 border-t border-gray-100 flex-shrink-0">
        <input
          type="file"
          accept="image/*"
          ref={fileRef}
          onChange={handleImageUpload}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full bg-gray-900 text-white rounded-2xl py-3 font-medium active:opacity-70 disabled:opacity-40 text-sm"
        >
          {uploading ? '送信中...' : '📷  画像を送る'}
        </button>
      </div>
    </main>
  )
}
