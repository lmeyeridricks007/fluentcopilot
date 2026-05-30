# Component Inventory

## Layout
- **AppLayout** – Shell: OfflineBanner, Header, main outlet, BottomNav
- **Header** – Sticky top bar, back button on sub-screens, title
- **BottomNav** – Fixed bottom nav: Home, Learn, Practice, Exam, Profile

## UI Primitives
- **Button** – primary, secondary, ghost, danger; sm/md/lg; fullWidth, loading
- **Card** – elevated, outlined, flat; padding none/sm/md; CardHeader, CardTitle, CardDescription
- **Input** – label, error, hint, aria
- **ProgressBar** – value, max, variant (default, success, warning), showLabel
- **Skeleton** – animate-pulse block; CardSkeleton
- **EmptyState** – icon, title, description, action
- **ErrorState** – title, message, onRetry
- **LoadingScreen** – spinner + text
- **OfflineBanner** – Shown when navigator.onLine is false
- **PermissionGate** – microphone, geolocation, notifications; onRequest, onFallback, children
- **PremiumLock** – inline, card, overlay; featureName, onUnlock

## Feature-specific (presentational)
- Used inline in pages (e.g. lesson cards, scenario chips, message bubbles). No separate component files for one-off patterns; reusable patterns live in `components/ui` or `components/premium`.

## Icons
- Lucide React: ArrowLeft, Home, BookOpen, Mic, ClipboardList, User, Send, Bot, User, etc.
