'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const IMAGE_EXPIRE_SECONDS = 10 // 画像の表示時間（秒）

export default function ChatPage() {
  const [session, setSession] = useState<any>(null)
  const [friends, setFriends] = useState<any[]>([])
  const [selectedFriend, setSelectedFriend] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // セッション確認
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setSession(session)
      fetchFriends(session.user.id)
    })
  }, [])

  // フレンド一覧取得
  const fetchFriends = async (userId: string) => {
    const { data } = await supabase
      .from('friendships')
      .select('friend_id, profiles!friendships_friend_id_fkey(id, username)')
      .eq('user_id', userId)
    if (data) setFriends(data.map((d: any) => d.profiles))
  }

  // メッセージ取得
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

  // リアルタイム購読
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
        // last_activityを更新
        supabase.from('last_activity').update({ updated_at: new Date().toISOString() }).eq('id', 1)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedFriend])

  // 画像送信
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedFriend) return
    setUploading(true)

    const filename = `${Date.now()}_${file.name}`
    const { data: uploadData, error } = await supabase.storage
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

  // 画像が期限切れかチェック
  const isExpired = (msg: any) => {
    return new Date(msg.expires_at) < new Date()
  }

  const isMine = (msg: any) => msg.sender_id === session?.user.id

  // フレンド選択画面
  if (!selectedFriend) {
    return (
      <main className="min-h-screen bg-gray-50 p-6 max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-800">トーク</h2>
          <button
            onClick={() => router.push('/chat/add-friend')}
            className="text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-1"
          >
            ＋ 追加
          </button>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/auth'))}
            className="text-xs text-gray-400"
          >
            ログアウト
          </button>
        </div>

        {friends.length === 0 ? (
          <p className="text-gray-400 text-sm text-center mt-20">
            フレンドがまだいません
          </p>
        ) : (
          <div className="space-y-2">
            {friends.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFriend(f)}
                className="w-full bg-white rounded-2xl p-4 shadow-sm text-left flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                  {f.username[0].toUpperCase()}
                </div>
                <span className="font-medium text-gray-800">{f.username}</span>
              </button>
            ))}
          </div>
        )}
      </main>
    )
  }

  // チャット画面
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      {/* ヘッダー */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={() => setSelectedFriend(null)} className="text-gray-400 text-lg">←</button>
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm">
          {selectedFriend.username[0].toUpperCase()}
        </div>
        <span className="font-medium text-gray-800">{selectedFriend.username}</span>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${isMine(msg) ? 'justify-end' : 'justify-start'}`}>
            {isExpired(msg) ? (
              <div className="bg-gray-200 rounded-2xl px-4 py-2 text-xs text-gray-400">
                画像の表示期限が切れました
              </div>
            ) : (
              <img
                src={msg.image_url}
                alt="画像"
                className="max-w-[60vw] max-h-60 rounded-2xl object-cover shadow-sm"
              />
            )}
          </div>
        ))}
      </div>

      {/* 送信ボタン */}
      <div className="bg-white px-4 py-3 shadow-sm">
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
          className="w-full bg-gray-800 text-white rounded-xl py-3 font-medium active:opacity-70 disabled:opacity-40"
        >
          {uploading ? '送信中...' : '📷 画像を送る'}
        </button>
      </div>
    </main>
  )
}
