'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { navigateTo } from '@/lib/navigate'

const IMAGE_EXPIRE_SECONDS = 86400 // 24時間

export default function ChatPage() {
  const [session, setSession] = useState<any>(null)
  const [friends, setFriends] = useState<any[]>([])
  const [selectedFriend, setSelectedFriend] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigateTo(router, '/auth'); return }
      setSession(session)
      fetchFriends(session.user.id)
    })
  }, [])

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // iOS キーボード対応: visualViewportの高さをCSS変数に反映
  useEffect(() => {
    if (!selectedFriend) return
    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.style.height = `${vv.height}px`
          containerRef.current.style.transform = `translateY(${vv.offsetTop}px)`
        }
      })
    }

    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()

    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [selectedFriend])

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
    const userId = session.user.id
    const friendId = selectedFriend.id

    const channel = supabase
      .channel(`messages-${userId}-${friendId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${userId}`,
      }, (payload) => {
        const msg = payload.new as any
        if (msg.sender_id === friendId) {
          setMessages((prev) => [...prev, msg])
        }
        supabase.from('last_activity').update({ updated_at: new Date().toISOString() }).eq('id', 1)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedFriend])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedFriend) return
    setUploading(true)
    setError('')

    const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}`
    const { error: uploadError } = await supabase.storage
      .from('chat-images')
      .upload(filename, file)

    if (uploadError) {
      setError('画像の送信に失敗しました')
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    // Signed URLを生成（有効期限 = 画像表示期限）
    const { data: signedData, error: signError } = await supabase.storage
      .from('chat-images')
      .createSignedUrl(filename, IMAGE_EXPIRE_SECONDS)

    if (signError || !signedData) {
      setError('URLの生成に失敗しました')
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    const expiresAt = new Date(Date.now() + IMAGE_EXPIRE_SECONDS * 1000).toISOString()

    const { data: newMsg, error: insertError } = await supabase.from('messages').insert({
      sender_id: session.user.id,
      receiver_id: selectedFriend.id,
      image_url: signedData.signedUrl,
      storage_path: filename,
      expires_at: expiresAt,
    }).select().single()

    if (insertError) {
      setError('メッセージの保存に失敗しました')
    } else if (newMsg) {
      setMessages((prev) => [...prev, newMsg])
    }

    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSendText = async () => {
    if (!text.trim() || !selectedFriend) return
    setError('')
    const { data: newMsg, error: insertError } = await supabase.from('messages').insert({
      sender_id: session.user.id,
      receiver_id: selectedFriend.id,
      text: text.trim(),
    }).select().single()
    if (insertError) {
      setError('メッセージの送信に失敗しました')
    } else if (newMsg) {
      setMessages((prev) => [...prev, newMsg])
    }
    setText('')
  }

  const isExpired = (msg: any) => msg.expires_at && new Date(msg.expires_at) < new Date()
  const isMine = (msg: any) => msg.sender_id === session?.user.id

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // トーク一覧
  if (!selectedFriend) {
    return (
      <main className="h-full bg-gray-50 flex flex-col overflow-y-auto">
        <div className="bg-white px-4 pt-[env(safe-area-inset-top,16px)] pb-4 flex justify-between items-center border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">トーク</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateTo(router, '/chat/add-friend')}
              className="text-sm text-gray-500 border border-gray-200 rounded-full px-3 py-1"
            >
              + 追加
            </button>
            <button
              onClick={() => supabase.auth.signOut().then(() => navigateTo(router, '/auth'))}
              className="text-sm text-gray-400"
            >
              ログアウト
            </button>
          </div>
        </div>

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
    <main ref={containerRef} className="flex flex-col bg-gray-50 overflow-hidden" style={{ height: '100%', position: 'relative' }}>
      <div className="bg-white px-4 pt-[env(safe-area-inset-top,12px)] pb-3 flex items-center gap-3 border-b border-gray-100 flex-shrink-0">
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

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${isMine(msg) ? 'items-end' : 'items-start'}`}>
            {msg.image_url ? (
              isExpired(msg) ? (
                <div className="rounded-2xl px-4 py-2 text-xs text-gray-400 bg-gray-200">
                  画像の表示期限が切れました
                </div>
              ) : (
                <img
                  src={msg.image_url}
                  alt="画像"
                  className="max-w-[70vw] max-h-72 rounded-2xl object-cover shadow-sm"
                />
              )
            ) : msg.text ? (
              <div className={`rounded-2xl px-4 py-2 max-w-[75vw] ${
                isMine(msg) ? 'bg-gray-900 text-white' : 'bg-white text-gray-900 border border-gray-100'
              }`}>
                <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
              </div>
            ) : null}
            <span className="text-xs text-gray-400 mt-1 px-1">
              {formatTime(msg.created_at)}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="bg-white px-3 py-3 pb-[env(safe-area-inset-bottom,12px)] border-t border-gray-100 flex-shrink-0">
        {error && (
          <p className="text-red-400 text-xs mb-2 text-center">{error}</p>
        )}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileRef}
          onChange={handleImageUpload}
          className="hidden"
        />
        <div className="flex items-end gap-2">
          <button
            onClick={() => {
              if (fileRef.current) {
                fileRef.current.removeAttribute('capture')
                fileRef.current.click()
              }
            }}
            disabled={uploading}
            className="text-gray-500 active:text-gray-800 p-2 flex-shrink-0"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
          <button
            onClick={() => {
              if (fileRef.current) {
                fileRef.current.setAttribute('capture', 'environment')
                fileRef.current.click()
              }
            }}
            disabled={uploading}
            className="text-gray-500 active:text-gray-800 p-2 flex-shrink-0"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendText()
              }
            }}
            placeholder="メッセージを入力"
            rows={1}
            className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-base leading-6 focus:outline-none focus:border-gray-400 resize-none max-h-24"
          />
          <button
            onClick={handleSendText}
            disabled={!text.trim()}
            className="bg-gray-900 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 active:opacity-70 disabled:opacity-30"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
        {uploading && (
          <p className="text-xs text-gray-400 text-center mt-1">画像を送信中...</p>
        )}
      </div>
    </main>
  )
}
