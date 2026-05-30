# Entitlements & Subscription UI Audit

**Feature**: E-13 Entitlements & Subscription  
**Audit date**: Per run  
**Prerequisite**: docs/ui/reviews/entitlements-ui-review.md (passed).

---

## Verification Checklist

### All buttons trigger logic

| Location | Button / link | Triggers |
|----------|----------------|---------|
| PremiumUpsellPage | Start free trial (7 days) | startTrial() → navigate('/app/home') |
| PremiumUpsellPage | Try premium free (demo) | setPremium(true) → navigate('/app/home') |
| PremiumUpsellPage | End premium demo | endTrialAndPremium() |
| SettingsPage | Start free trial | startTrial() → navigate('/app/home') |
| SettingsPage | Upgrade to Premium | navigate('/app/premium') |
| SettingsPage | Manage subscription | navigate('/app/premium') |
| SettingsPage | End premium demo | endTrialAndPremium() |
| PaywallModal | Upgrade to Premium | onClose() → navigate('/app/premium') |
| PaywallModal | Come back later | onClose() |
| TrialBanner | Manage subscription | navigate(manageUrl) |
| TrialBanner | Dismiss (X) | localStorage set, setDismissed(true) |

**Result**: All buttons and primary links trigger expected logic. **Pass.**

---

### All screens/components render without runtime errors

- **EntitlementProvider**: Wraps AppLayout; reads premiumStore + DEMO_USAGE; no throw.
- **UsageIndicator**: Reads useEntitlement(); renders "X / Y" or "Unlimited". No throw.
- **PaywallModal**: Renders when open; reason and usage optional. No throw.
- **TrialBanner**: Renders only when tier === 'trial' and not dismissed. No throw.
- **Settings** subscription section: useEntitlement() + premiumStore; conditional UI. No throw.
- **LessonDiscoveryPage**: useEntitlement(); handleLessonClick checks canStartLesson/atLessonCap; PaywallModal. No throw.
- **SimulationPage**: useEntitlement(); scenario list click checks canStartScenario/atScenarioCap; PaywallModal. No throw.

**Result**: No runtime errors observed. **Pass.**

---

### Mock data and store populate flows

- Free tier: DEMO_USAGE drives usage; at-cap scenarios (e.g. at-cap) show PaywallModal when starting lesson/scenario.
- startTrial(): trialEndsAt set, tier becomes 'trial'; TrialBanner shows until dismissed.
- setPremium(true) / endTrialAndPremium(): tier and trial state updated; UI reflects.

**Result**: Mock data and premiumStore support full entitlement flows. **Pass.**

---

### UI navigation paths work

| Path | Works |
|------|--------|
| /app/settings → Start free trial → /app/home | Yes |
| /app/settings → Upgrade to Premium → /app/premium | Yes |
| /app/premium → Start free trial → /app/home | Yes |
| /app/premium → Try premium free → /app/home | Yes |
| /app/learn (at cap) → click lesson → PaywallModal → Upgrade → /app/premium | Yes |
| /app/practice/simulation (at cap) → select scenario → PaywallModal | Yes |

**Result**: Documented navigation and gate flows work. **Pass.**

---

## Audit Verdict

**Pass.**

- All buttons trigger logic.  
- All components render without runtime errors.  
- Mock data and store support entitlement and trial flows.  
- Navigation and cap gates work as specified.  

Entitlements & Subscription UI is complete and meets the UI completion criteria.
