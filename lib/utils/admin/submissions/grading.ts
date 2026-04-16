// lib/utils/submissions/grading.ts
import type { QuestionType } from '@/lib/types/database'
import type { GradeResult }  from '@/lib/types/admin/exams/submissions/answer.types'
import { AUTO_TYPES }        from './constants'

/**
 * Computes is_correct and points_earned for a single answer.
 *
 * Auto-grade types (MCQ, T/F, fill_blank):
 *   - Case-insensitive trim comparison
 *   - Returns boolean is_correct + full or zero points
 *
 * Manual types (essay, short_answer, matching):
 *   - Returns is_correct: null (pending human review)
 *   - Returns points_earned: 0 (updated by grader manually)
 *
 * FUTURE: Pass manual types to a Python AI service for assisted scoring.
 */
export function gradeAnswer(
  answerText:    string | null,
  correctAnswer: string | null,
  questionType:  QuestionType,
  points:        number,
): GradeResult {
  if (!AUTO_TYPES.includes(questionType)) {
    // FUTURE: sendToPythonService(answerText) for essay/short_answer AI grading
    return { is_correct: null, points_earned: 0 }
  }

  if (correctAnswer === null || answerText === null) {
    return { is_correct: false, points_earned: 0 }
  }

  const correct =
    answerText.trim().toLowerCase() === correctAnswer.trim().toLowerCase()

  return { is_correct: correct, points_earned: correct ? points : 0 }
}

/**
 * Computes the total score from an array of point values.
 */
export function sumPoints(pointsEarned: (number | null)[]): number {
  return pointsEarned.reduce<number>((acc, p) => acc + (p ?? 0), 0)
}

/**
 * Derives percentage and pass/fail from earned points.
 */
export function computeScore(
  earned:      number,
  totalPoints: number,
  passingScore: number,
): { percentage: number; passed: boolean } {
  const percentage =
    totalPoints > 0
      ? parseFloat(((earned / totalPoints) * 100).toFixed(2))
      : 0
  return { percentage, passed: percentage >= passingScore }
}