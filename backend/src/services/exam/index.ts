/**
 * Fluent Exam — persistence service entry (SQL-backed).
 * HTTP handlers can compose this with `mssql` pool wiring later.
 */
export type { ExamRepository } from '../../repositories/contracts/examRepository.contract'
export { examSqlRepository } from '../../repositories/examSqlRepository'
