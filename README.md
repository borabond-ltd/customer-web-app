# BoraBond - Smart Bond Investment Platform

A modern Progressive Web App (PWA) for investing in government bonds with confidence.

## 🚀 Production Deployment

### Quick Start
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start production server
npm run start:production
```

### Local dev → sandbox API

Keep secrets in gitignored `customer-app/.env` (not committed):

- `NEXT_PUBLIC_API_URL=https://staging-api.borabond.com/api/v1`
- `NEXT_PUBLIC_AUTH_PROVIDER=google`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID=...`
- `npm run dev` or `npm run dev:sandbox`

Use `http://localhost:9000/api/v1` when running **api-gateway** locally (see [PORTS.md](../PORTS.md)).

### Environment Variables
Set these in your hosting platform (Google Identity Services, no Supabase):
```bash
NEXT_PUBLIC_API_URL=https://core-api.borabond.com/api/v1
NEXT_PUBLIC_AUTH_PROVIDER=google
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-web-client.apps.googleusercontent.com
```

**Password reset (production on [app.borabond.com](https://app.borabond.com/)):**
Forgot/reset use the same gateway (`POST /auth/forgot-password` and `/auth/reset-password`).

```bash
NEXT_PUBLIC_API_URL=https://core-api.borabond.com/api/v1
```

| Piece | Host |
|-------|------|
| Reset UI | `https://app.borabond.com/reset-password?token=...` |
| API | `POST https://core-api.borabond.com/api/v1/auth/reset-password` |

Must use `/api/v1` (not `/api`) — gateway does not serve legacy `/api/auth/*` unless rewritten.

Google sign-in uses GIS ID tokens → `POST /api/v1/auth/google`. See `.env.example`.

### Staging on Vercel (`dev` branch) vs production (`main`)

Same variable name, **different values per Vercel environment**.

| Vercel environment | Branch | `NEXT_PUBLIC_API_URL` |
|--------------------|--------|------------------------|
| **Production** | `main` | `https://core-api.borabond.com/api/v1` |
| **Preview** | `dev` | `https://staging-api.borabond.com/api/v1` |

Also set `NEXT_PUBLIC_AUTH_PROVIDER=google` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. Remove `NEXT_PUBLIC_SUPABASE_*`. Do **not** set `NEXT_PUBLIC_API_URL` for “All Environments”.

Step-by-step: **[docs/VERCEL_STAGING.md](./docs/VERCEL_STAGING.md)**  
API contract: **[docs/MICROSERVICES_CONTRACT.md](./docs/MICROSERVICES_CONTRACT.md)**

### PWA Features
- ✅ Offline support
- ✅ Add to Home Screen
- ✅ Push notifications
- ✅ App-like experience
- ✅ Performance optimized

### Build Commands
```bash
npm run build              # Production build
npm run build:analyze      # Build with bundle analysis
npm run start:production   # Start production server
npm run audit:lighthouse   # PWA audit
```

### Deployment Platforms
- **Vercel** (Recommended)
- **Netlify**
- **AWS S3 + CloudFront**
- **Any CDN/hosting platform**

## 📱 PWA Installation

### Android
- Tap "Add to Home Screen" when prompted
- Or use browser menu → "Install app"

### iOS
- Tap Share button → "Add to Home Screen"
- Or use Safari menu → "Add to Home Screen"

### Desktop
- Click install button in address bar
- Or use browser menu → "Install BoraBond"

## 🔧 Technical Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **PWA**: Workbox + next-pwa
- **Authentication**: Supabase Auth
- **State Management**: React Context
- **Icons**: Lucide React

## 📊 Performance

- **Lighthouse Score**: 90+
- **Bundle Size**: Optimized with code splitting
- **Loading Time**: < 3s on 3G
- **Offline Support**: Full functionality

## 🛡️ Security

- HTTPS required for PWA
- Secure authentication
- Environment variable protection
- No sensitive data in client

## 📞 Support

For production issues or deployment questions, contact the development team.

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**License**: Proprietary
