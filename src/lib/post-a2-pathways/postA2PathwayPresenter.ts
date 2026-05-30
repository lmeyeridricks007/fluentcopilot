import { POST_A2_TRANSITION_HREF } from '@/lib/post-a2/postA2PathRouter'
import type { PostA2PathwayChoice } from '@/lib/post-a2-pathways/postA2PathwayState'

export function postA2PathwayShortLabel(choice: PostA2PathwayChoice): string {
  switch (choice) {
    case 'continue_b1':
      return 'Start B1'
    case 'a2_mastery':
      return 'A2 Mastery'
    case 'exam_preparation':
      return 'Exam preparation'
    default:
      return ''
  }
}

/** Home / Practice compact banner when A2 path is complete. */
export function postA2PathwayHomeBanner(choice: PostA2PathwayChoice | null): {
  title: string
  body: string
  cta: string
  href: string
} {
  if (!choice) {
    return {
      title: 'Your next chapter after A2',
      body: 'Start B1, strengthen real-life A2 mastery, or prepare for your Dutch A2 exam — you choose.',
      cta: 'See your options →',
      href: POST_A2_TRANSITION_HREF,
    }
  }
  switch (choice) {
    case 'continue_b1':
      return {
        title: 'Your path: B1',
        body: 'You chose the next level. Open your B1 space — Practice and Exam Prep stay available anytime.',
        cta: 'Continue B1 →',
        href: '/app/learn/b1',
      }
    case 'a2_mastery':
      return {
        title: 'Your path: A2 Mastery',
        body: 'Build calm, real-life confidence before B1 — Talk for scenarios and voice, Coach for memory, Exam when you need outcomes.',
        cta: 'Open Talk →',
        href: '/app/talk',
      }
    case 'exam_preparation':
      return {
        title: 'Your path: Exam preparation',
        body: 'Structured speaking, writing, listening, reading, and KNM — plus practice exams and readiness.',
        cta: 'Open exam preparation →',
        href: '/app/exam-prep',
      }
    default:
      return postA2PathwayHomeBanner(null)
  }
}
