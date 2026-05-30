import { SectionHeader } from '@/features/practice-hub/components/SectionHeader'

/** Exam Prep uses the same typography scale as Practice for consistency. */
export function ExamPrepSectionHeader(props: React.ComponentProps<typeof SectionHeader>) {
  return <SectionHeader {...props} />
}
