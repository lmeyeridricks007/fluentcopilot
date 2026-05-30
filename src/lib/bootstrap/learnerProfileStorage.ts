/**
 * @deprecated Import from `@/lib/storage` — kept so existing call sites stay stable.
 */
export {
  createDefaultUserProfile as createDefaultLearnerProfile,
  learnerProfileStorageKey,
  parseUserProfileLenient as parseLearnerProfile,
  readUserProfileFromStorage as readLearnerProfileFromStorage,
  writeUserProfileToStorage as writeLearnerProfileToStorage,
} from '@/lib/storage/profileStorage'
