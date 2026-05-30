# Learner App — Component Inventory

## Layout
- **AppLayout** – Shell: OfflineBanner, Header, main outlet, BottomNav
- **Header** – Sticky top bar, back on sub-screens, title
- **BottomNav** – Fixed bottom: Home, Learn, Practice, Progress, Settings

## UI primitives
- **Button** – primary, secondary, ghost, danger; sizes; fullWidth, loading
- **Card** – elevated, outlined, flat; CardHeader, CardTitle, CardDescription
- **Input** – label, error, hint
- **ProgressBar** – value, max, variant, showLabel
- **Skeleton**, **CardSkeleton**
- **EmptyState** – icon, title, description, action
- **ErrorState** – title, message, onRetry
- **LoadingScreen**
- **OfflineBanner**

## Permission & premium
- **PermissionGate** – microphone, geolocation, notifications; onRequest, onFallback
- **PremiumLock** – inline, card, overlay; featureName, onUnlock

## Feature-specific (inline in pages)
- Lesson cards, scenario chips, message bubbles, coaching panel, streak/XP cards, etc. Reusable patterns live in components/ui or components/premium.

## Icons
- Lucide React (ArrowLeft, Home, BookOpen, Mic, Lock, Send, Bot, User, etc.)
