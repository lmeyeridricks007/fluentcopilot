/**
 * Client persistence for Feature 1 chat threads.
 *
 * - Zustand `persist` name: `fc-feature1-chat-v1` (see `conversationStore.ts`)
 * - State is sharded by `byUserId` so multiple accounts on one device keep separate threads
 * - Anonymous learners use `LOCAL_ANONYMOUS_LEARNER_ID` from `@/lib/storage/storageKeys`
 */
export const FEATURE1_CHAT_STORAGE_KEY = 'fc-feature1-chat-v1' as const
