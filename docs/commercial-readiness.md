# Commercial Readiness — App Store Release Gaps

## App Store Publishing Costs

- **Apple App Store:** $99/year (Apple Developer Program)
- **Google Play Store:** $25 one-time

No per-app or per-download fees.

## Gaps

### 1. Native Wrapper

Capacitor plan exists in `docs/testflight.md` but not yet set up (`@capacitor/core` not in `package.json`). Apple won't accept a bare web URL submission.

### 2. Monetization / Business Model

Currently users bring their own API keys. Commercial options:

- **Subscription** — proxy LLM calls through a backend, users pay monthly ($5–10/mo). Requires a backend API server.
- **Freemium** — free tier with limited generations, paid for more. Still needs a backend.
- **One-time purchase** — users still BYO API key. Simplest but limits audience.

Apple takes 15–30% of in-app purchases/subscriptions. iOS payments must use Apple's StoreKit.

### 3. Backend / API Proxy

API keys currently sit in localStorage in plaintext. For commercial release:

- Users shouldn't need to understand what an API key is
- Backend holds LLM API keys and proxies requests
- Enables cost control, rate-limiting, and usage analytics

### 4. User Authentication

Supabase auth exists for cloud sync. Still needed:

- Account management (password reset, email verification, delete account)
- Linking auth to entitlements/subscription status
- Apple Sign In (required if any third-party login is offered on iOS)

### 5. Legal / Compliance

Missing entirely:

- **Privacy Policy** (required by both app stores)
- **Terms of Service**
- **EULA** (Apple requires one)
- **GDPR/CCPA compliance** for EU/California users
- **COPPA** considerations if targeting younger learners
- Data deletion flow ("right to be forgotten")

### 6. App Store Review Friction Points

- App name: `"temp-app"` in `package.json` — needs real branding ("Mandu" from `index.html` works)
- Full set of iOS icon sizes (1024x1024 for App Store listing)
- Screenshots: 6.7" and 6.5" iPhone, plus iPad if supported
- App Store description and metadata
- Apple rejects apps that are "just a web view" — add at least one native plugin (notifications, TTS, haptics)

### 7. Offline Experience

PWA/service worker exists but needs testing inside Capacitor's WKWebView. Cached readers and flashcard review should work without connectivity.

### 8. TTS

Web Speech API is unreliable in WKWebView. For a language learning app, TTS is critical. Options: `@capacitor-community/text-to-speech` or a cloud TTS API.

### 9. Polish & Production Readiness

- Error reporting / crash analytics (Sentry, etc.)
- Onboarding flow for new users
- App rating prompts
- Push notifications (streak reminders, review due)
- Accessibility audit (VoiceOver compliance checked in App Store review)

### 10. UI/UX Polish

The design system is solid (comprehensive CSS variables, dark mode, accessibility, responsive layout) but reads as "developer-built" rather than "consumer product."

**"Homebrew" indicators:**

- **Serif fonts for UI chrome** — `Cormorant Garamond` used for buttons/labels; modern apps use sans-serifs (Inter, SF Pro) for UI, reserving serif for reading content only
- **Emoji as icons** — Unicode emoji (☰, ✕, ⚙) instead of a proper icon library (Lucide, Feather, Heroicons)
- **Flat interactions** — buttons only change color on hover; no elevation, scale, or depth micro-interactions
- **No visual feedback** — settings save silently; no toast/snackbar confirmations
- **No illustrations** — empty states and onboarding use plain text/icons, not custom illustrations
- **Muted palette** — elegant but conservative compared to competitors (Duolingo, LingQ, Drops)
- **No loading skeletons** — spinners instead of skeleton placeholders for content loading
- **No 3D card flip** — flashcards use fade-reveal instead of the expected flip animation
- **No drag-and-drop** — sentence builder and matching exercises are click-only
- **Minimal celebration** — milestones exist but lack confetti, sounds, or delightful animations

**Current design strengths (keep these):**

- Cohesive CSS variable system with proper dark mode
- Excellent CJK typography (Noto Serif SC/TC/KR with tuned line-heights)
- Proper safe-area insets and touch-target sizing on mobile
- `prefers-reduced-motion` respected for accessibility
- Consistent card/modal/button styling across views

**Quick wins (2–3 days):** ✅ All done

1. ~~Replace serif font with system sans-serif for UI chrome~~ ✅ System sans-serif for UI, `--font-reading` for content
2. ~~Add hover scale/elevation to interactive elements~~ ✅ `translateY(-1px)` + shadow on buttons, pills, cards
3. ~~Add toast notifications for settings save~~ ✅ Dark mode, romanization, paragraph tools toggles
4. ~~Replace emoji icons with Lucide~~ ✅ 22 Lucide icons across ~18 files
5. ~~Add confetti animation to milestone celebrations~~ ✅ `canvas-confetti` with major/normal intensity

**Medium effort (1–2 weeks):** ✅ All done

6. ~~Reading progress indicator~~ ✅ Fixed 3px bar at top, passive scroll + rAF
7. ~~Skeleton loaders~~ ✅ Skeleton component with shimmer, used in generating/evicted states
8. ~~3D card flip animation~~ ✅ Dual-face with perspective/backface-visibility, reduced-motion fallback
9. ~~Drag-and-drop for sentence builder and matching~~ ✅ Pointer events hook, ghost element, click preserved
10. ~~Subtle gradients/depth~~ ✅ Sidebar gradient, stat card gradient, mobile header shadow

**Larger polish (ongoing):**

11. Custom illustrations for empty states, error states, onboarding
12. Brand guidelines / Figma component library
13. Sound effects (card flip, correct answer, milestone)
14. Animated transitions between views (not just instant swap)
15. Optimized web font loading (subset, preload, or replace with system fonts)

## Priority Order

| Priority | Item | Effort |
|----------|------|--------|
| 1 | Decide business model (subscription vs BYO key) | Decision |
| 2 | Build backend API proxy (if subscription) | Medium-Large |
| 3 | Capacitor setup + native TTS plugin | Small |
| 4 | Privacy Policy + ToS + EULA | Small (template) |
| 5 | Apple Sign In + subscription via StoreKit | Medium |
| 6 | App icons, screenshots, store metadata | Small |
| 7 | Analytics + error reporting | Small |
| 8 | Onboarding flow | Small-Medium |

The BYO-API-key model is the fastest path to the App Store (skip items 2 and 5), but limits audience since most people don't know what an API key is. A subscription model is more work but is the standard for language learning apps.
