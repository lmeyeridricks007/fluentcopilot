/**
 * Load authored JSON into typed structures for the lesson engine + validators.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { courseSchema, type Course } from '@/lib/schemas/course.schema'
import { moduleSchema, type CourseModule } from '@/lib/schemas/module.schema'
import { lessonSchema, type Lesson } from '@/lib/schemas/lesson.schema'

export function readJsonFile(path: string): unknown {
  if (!existsSync(path)) throw new Error(`Missing file: ${path}`)
  return JSON.parse(readFileSync(path, 'utf8')) as unknown
}

export function loadCourseFromFile(path: string): Course {
  const raw = readJsonFile(path)
  return courseSchema.parse(raw)
}

export function loadModuleFromFile(path: string): CourseModule {
  const raw = readJsonFile(path)
  return moduleSchema.parse(raw)
}

export function loadLessonFromFile(path: string): Lesson {
  const raw = readJsonFile(path)
  return lessonSchema.parse(raw)
}

export type CourseManifest = {
  id: string
  title: string
  language: 'nl'
  cefrLevel: 'A2'
  description: string
  metadata?: Record<string, unknown>
  modulePaths: string[]
}

export function loadCourseFromManifest(manifestPath: string): Course {
  const raw = readJsonFile(manifestPath) as CourseManifest
  const base = dirname(manifestPath)
  const modules: CourseModule[] = raw.modulePaths.map((rel) => loadModuleFromFile(resolve(base, rel)))
  return courseSchema.parse({
    id: raw.id,
    title: raw.title,
    language: raw.language,
    cefrLevel: raw.cefrLevel,
    description: raw.description,
    metadata: raw.metadata,
    modules,
  })
}
