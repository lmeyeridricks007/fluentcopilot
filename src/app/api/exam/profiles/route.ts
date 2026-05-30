import { NextResponse } from 'next/server'
import { getExamProfileSummariesFromRegistry } from '@/features/exam-system/examApi'

export const runtime = 'nodejs'

export async function GET() {
  const profiles = getExamProfileSummariesFromRegistry()
  return NextResponse.json({ profiles })
}
