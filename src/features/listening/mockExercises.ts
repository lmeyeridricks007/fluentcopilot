/**
 * Mock listening exercises for catalog and detail pages.
 */

export interface ListeningExercise {
  id: string
  title: string
  description: string
  level: string
  durationMinutes: number
}

export const MOCK_LISTENING_EXERCISES: ListeningExercise[] = [
  { id: 'cafe-order', title: 'Ordering at a café', description: 'Listen to a short dialogue and answer questions about the order.', level: 'A1', durationMinutes: 5 },
  { id: 'train-announcement', title: 'Train station announcement', description: 'Understand platform and delay information.', level: 'A2', durationMinutes: 6 },
  { id: 'job-interview', title: 'Job interview introduction', description: 'Practice listening to typical interview questions.', level: 'B1', durationMinutes: 8 },
]
