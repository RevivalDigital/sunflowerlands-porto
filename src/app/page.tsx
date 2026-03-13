'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import pb from '@/lib/pb'

export default function HomePage() {
  const router = useRouter()
  const { refreshAuth, user } = useAuthStore()

  useEffect(() => {
    refreshAuth()
    if (pb.authStore.isValid) {
      router.replace('/dashboard')
    } else {
      router.replace('/auth')
    }
  }, [])

  return (
    <div className="min-h-screen bg-pixel-bg flex items-center justify-center">
      <div className="text-center">
        <p className="font-pixel text-pixel-gold text-sm animate-pixel-blink">LOADING...</p>
        <div className="mt-4 pixel-progress w-48">
          <div className="pixel-progress-fill w-3/4" />
        </div>
      </div>
    </div>
  )
}
