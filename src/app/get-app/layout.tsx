import type { Metadata } from 'next';

const title = 'Get the BoraBond app';
const description =
  'Download BoraBond on the App Store or Google Play, or open the app if it is already installed.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/get-app',
  },
  openGraph: {
    title,
    description,
    url: '/get-app',
    siteName: 'BoraBond',
    type: 'website',
    images: [
      {
        url: '/images/logo.png',
        width: 1024,
        height: 1024,
        alt: 'BoraBond',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title,
    description,
    images: ['/images/logo.png'],
  },
  appleWebApp: {
    capable: true,
    title: 'BoraBond',
    statusBarStyle: 'default',
  },
  other: {
    'apple-itunes-app': 'app-id=6759091596',
    'google-play-app': 'app-id=com.borabond.mobile',
  },
};

export default function GetAppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
