/**
 * FD-09 — single module card (phrases, vocabulary, quiz, practice).
 */

import { useRouter } from 'next/navigation'
import { ChevronRight, BookOpen, List, HelpCircle, Mic } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { GeneratedDailyLessonModule } from '../types'

interface GeneratedLessonModuleCardProps {
  module: GeneratedDailyLessonModule
  lessonId: string
  onPractice?: (scenarioId?: string) => void
}

const MODULE_ICONS: Record<string, React.ReactNode> = {
  phrases: <BookOpen className="w-5 h-5" aria-hidden />,
  vocabulary: <List className="w-5 h-5" aria-hidden />,
  quiz: <HelpCircle className="w-5 h-5" aria-hidden />,
  scenario_recap: <BookOpen className="w-5 h-5" aria-hidden />,
  pronunciation: <Mic className="w-5 h-5" aria-hidden />,
  practice: <Mic className="w-5 h-5" aria-hidden />,
}

export function GeneratedLessonModuleCard({ module, lessonId, onPractice }: GeneratedLessonModuleCardProps) {
  const router = useRouter()
  const icon = MODULE_ICONS[module.type] ?? <BookOpen className="w-5 h-5" aria-hidden />

  const handleClick = () => {
    if (module.type === 'practice' && onPractice) {
      onPractice(module.scenarioId)
    } else {
      router.push(`/app/learn/${lessonId}?module=${module.moduleId}`)
    }
  }

  return (
    <Card
      variant="outlined"
      padding="sm"
      className="cursor-pointer hover:bg-surface-muted flex items-center gap-3"
      onClick={handleClick}
    >
      <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink-primary">{module.title}</p>
        {module.description && (
          <p className="text-caption text-ink-secondary mt-0.5">{module.description}</p>
        )}
        {module.itemCount != null && (
          <p className="text-caption text-ink-tertiary mt-0.5">{module.itemCount} items</p>
        )}
      </div>
      <ChevronRight className="w-5 h-5 text-ink-tertiary shrink-0" aria-hidden />
    </Card>
  )
}
