'use client'

import { useEffect, useState, type ReactNode } from 'react'

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.borabond.mobile'
const APP_STORE_URL = 'https://apps.apple.com/app/id6759091596'
const CUSTOM_SCHEME = 'com.borabond.mobile://open'
const INVITE_CODE_PATTERN = /^bora-[23456789abcdefghjkmnpqrstuvwxyz]{6}$/

type DevicePlatform = 'ios' | 'android' | 'other'

function isAndroid(userAgent: string): boolean {
  return /android/i.test(userAgent)
}

function isAppleMobile(userAgent: string): boolean {
  return /iphone|ipad|ipod/i.test(userAgent)
}

function detectPlatform(userAgent: string): DevicePlatform {
  if (isAndroid(userAgent)) return 'android'
  if (isAppleMobile(userAgent)) return 'ios'
  return 'other'
}

function isLocalLandingHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]' ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
  )
}

function referralFromSearch(): string {
  if (typeof window === 'undefined') return ''
  const raw = (new URLSearchParams(window.location.search).get('ref') || '').trim().toLowerCase()
  return INVITE_CODE_PATTERN.test(raw) ? raw : ''
}

function appOpenHref(ref: string): string {
  return ref ? `${CUSTOM_SCHEME}?ref=${encodeURIComponent(ref)}` : CUSTOM_SCHEME
}

function openInstalledApp(ref: string): void {
  window.location.href = appOpenHref(ref)
}

function openAndroidAppOrStore(ref: string): void {
  const fallback = encodeURIComponent(PLAY_STORE_URL)
  const path = ref ? `open?ref=${encodeURIComponent(ref)}` : 'open'
  window.location.replace(
    `intent://${path}#Intent;scheme=com.borabond.mobile;package=com.borabond.mobile;S.browser_fallback_url=${fallback};end`,
  )
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M16.125 1.2c.07 1.17-.34 2.32-1.03 3.16-.7.86-1.84 1.53-2.96 1.44-.14-1.13.4-2.32 1.05-3.1.73-.86 2-1.5 2.94-1.5zM20.66 17.52c-.74 1.1-1.54 2.19-2.73 2.21-1.2.03-1.58-.71-2.95-.71s-1.79.69-2.93.73c-1.17.05-2.06-1.18-2.81-2.27C7.5 15.3 6.33 11.23 7.9 8.5c.78-1.36 2.17-2.22 3.69-2.24 1.15-.02 2.23.78 2.95.78s2.02-.96 3.41-.82c.58.03 2.21.23 3.26 1.77-.08.05-1.94 1.14-1.92 3.41.03 2.7 2.37 3.6 2.4 3.61-.03.06-.37 1.29-1.23 2.51z" />
    </svg>
  )
}

function PlayStoreIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#34A853" d="M3.6 21.6 13.8 12 3.6 2.4v19.2z" />
      <path fill="#FBBC04" d="m13.8 12 3.1-3.1L4.7 1.6c-.4-.24-.86-.18-1.1.2z" />
      <path fill="#4285F4" d="M20.3 10.7c.7.4.7 1.2 0 1.6l-3.4 2-3.1-2.3 3.1-2.3z" />
      <path fill="#EA4335" d="m13.8 12 3.1 3.1L3.6 22.2c.24.38.7.44 1.1.2z" />
    </svg>
  )
}

function StoreBadge({
  href,
  icon,
  caption,
  title,
  recommended,
  recommendedLabel,
}: {
  href: string
  icon: ReactNode
  caption: string
  title: string
  recommended?: boolean
  recommendedLabel?: string
}) {
  return (
    <a
      href={href}
      className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0FA958] focus-visible:ring-offset-2 ${
        recommended ? 'bg-[#111111] ring-2 ring-[#0FA958] ring-offset-2' : 'bg-[#171717]'
      }`}
    >
      {recommended && recommendedLabel ? (
        <span className="absolute -top-2.5 right-3 rounded-full bg-[#0FA958] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          {recommendedLabel}
        </span>
      ) : null}
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/8">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-white/70">
          {caption}
        </span>
        <span className="mt-0.5 block text-lg font-semibold leading-none">{title}</span>
      </span>
    </a>
  )
}

export default function GetAppPage() {
  const [isLocal, setIsLocal] = useState(false)
  const [openHref, setOpenHref] = useState(CUSTOM_SCHEME)
  const [referral, setReferral] = useState('')
  const [platform, setPlatform] = useState<DevicePlatform>('other')

  useEffect(() => {
    const local = isLocalLandingHost(window.location.hostname)
    const ref = referralFromSearch()
    const userAgent = navigator.userAgent || ''
    setIsLocal(local)
    setReferral(ref)
    setOpenHref(appOpenHref(ref))
    setPlatform(detectPlatform(userAgent))

    if (isAndroid(userAgent)) {
      if (local) {
        openInstalledApp(ref)
        return
      }
      openAndroidAppOrStore(ref)
      return
    }

    if (!isAppleMobile(userAgent)) return

    const started = Date.now()
    openInstalledApp(ref)
    if (local) return

    let storeTimer: number | undefined
    const cancelStoreRedirect = () => {
      if (storeTimer !== undefined) window.clearTimeout(storeTimer)
    }

    document.addEventListener('visibilitychange', cancelStoreRedirect)
    storeTimer = window.setTimeout(() => {
      if (document.visibilityState === 'visible' && Date.now() - started < 2500) {
        window.location.replace(APP_STORE_URL)
      }
    }, 1500)

    return () => {
      document.removeEventListener('visibilitychange', cancelStoreRedirect)
      cancelStoreRedirect()
    }
  }, [])

  const stores = [
    {
      key: 'ios' as const,
      href: APP_STORE_URL,
      icon: <AppleIcon className="h-8 w-8 text-white" />,
      caption: 'Download on the',
      title: 'App Store',
      recommendedLabel: 'For your iPhone',
    },
    {
      key: 'android' as const,
      href: PLAY_STORE_URL,
      icon: <PlayStoreIcon className="h-8 w-8" />,
      caption: 'Get it on',
      title: 'Google Play',
      recommendedLabel: 'For your Android',
    },
  ]

  const orderedStores = platform === 'android' ? [...stores].reverse() : stores

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#EAF8F0] px-4 py-6 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-[#0FA958]/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-[#0B7F44]/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center justify-center">
        <div className="w-full rounded-[28px] border border-white/80 bg-white/95 p-6 text-center shadow-[0_20px_50px_rgba(13,27,20,0.08)] backdrop-blur sm:p-8">
          <div className="flex justify-center">
            <img
              src="/images/logo.png"
              alt="BoraBond"
              width={80}
              height={80}
              decoding="async"
              fetchPriority="high"
              className="h-20 w-20 rounded-2xl shadow-md"
            />
          </div>

          <h1 className="mt-4 text-[1.65rem] font-bold leading-tight text-[#0D1B14] sm:text-3xl">
            Get the BoraBond app
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-[#3A4A42]">
            {isLocal
              ? 'Local customer-app. If the debug build is installed, tap Open BoraBond below.'
              : 'Invest in government bonds from your phone. Download free, then continue in the app.'}
          </p>

          {referral ? (
            <p className="mt-3 inline-flex items-center rounded-full bg-[#EAF8F0] px-3 py-1 text-xs font-semibold text-[#0B7F44]">
              Invite ready · {referral}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2.5">
            {orderedStores.map((store) => (
              <StoreBadge
                key={store.key}
                href={store.href}
                icon={store.icon}
                caption={store.caption}
                title={store.title}
                recommended={platform === store.key}
                recommendedLabel={store.recommendedLabel}
              />
            ))}
          </div>

          <a
            href={openHref}
            className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-[#0FA958] px-4 py-3 text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#0B7F44] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0FA958] focus-visible:ring-offset-2"
          >
            Already have the app? Open BoraBond
          </a>

          <p className="mt-4 text-xs leading-relaxed text-[#6B7C74]">
            {referral
              ? 'Free to download on iOS and Android. Your invite stays attached when you open the app.'
              : 'Free to download on iOS and Android.'}
          </p>
        </div>
      </div>
    </main>
  )
}
