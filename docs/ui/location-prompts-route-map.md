# FD-08 Location-Aware Prompts — Route Map

| Route | Screen | Description |
|-------|--------|-------------|
| `/app/context-prompts` | ContextPromptsFeedPage | Smart Prompts feed: today's and recent prompts, save/dismiss, empty/loading/denied states |
| `/app/context-prompts/intro` | SmartPromptsIntroPage | Intro: what Smart Prompts are, how it works, enable CTA, permission card, premium gate |
| `/app/context-prompts/settings` | ContextPromptsSettingsPage | Settings: enable/disable, only when app open, notifications, venue categories, frequency, permission status |
| `/app/context-prompts/:promptId` | ContextPromptDetailPage | Single prompt: venue header, phrases, practice CTA, save/dismiss, premium gate |

## Entry points

- **Home**: "Smart Prompts near you" card → `/app/context-prompts/intro`
- **Settings**: "Location & Smart Prompts" row → `/app/context-prompts/settings`
- **Feed**: Settings icon → `/app/context-prompts/settings`; card tap → `/app/context-prompts/:promptId`

## Integration

- Detail "Start" practice → `/app/practice/simulation/:scenarioId`
- Premium CTA → `/app/premium`
