import { Injectable } from '@nestjs/common';
import { gradingNotesForQuestion, parseGradingGuide } from '../../../shared/exam-text';
import { AiServiceClient, AiServiceError } from './ai-service.client';

/** Ngữ cảnh chấm do RPC get_submission_grading_context trả về (chỉ service role đọc được). */
export type GradingContext = {
  question_id: string;
  position: number | string;
  question: string;
  reference_answer: string | null;
  max_score: number;
  grading_guide: string | null;
  criteria: Array<{ id: string; text: string; max_points: number }>;
};

export type AiCriterion = {
  criterion_id: string;
  awarded_points: number;
  assessment: string;
  evidence_excerpt: string;
  explanation: string;
};

export type GradeResult = {
  suggested_score: number;
  feedback_summary: string;
  criteria: AiCriterion[];
  needs_teacher_review: boolean;
  engine: string;
};

/**
 * Gắn "ý cần có" (phần sau "=>" trong barem) vào từng tiêu chí. Rubric được tạo từ chính barem theo thứ tự,
 * nên ghép theo vị trí và chỉ khi nội dung tiêu chí trùng khớp — barem đã sửa lệch thì bỏ qua cho an toàn.
 */
function withExpectedContent(criteria: GradingContext['criteria'], guideText: string | null, position: number) {
  const block = guideText ? parseGradingGuide(guideText).questions.find((item) => item.position === position) : undefined;
  return criteria.map((criterion, index) => {
    const parsed = block?.criteria[index];
    return parsed?.expected && parsed.text === criterion.text ? { ...criterion, expected_content: parsed.expected } : criterion;
  });
}

/**
 * Chấm transcript theo rubric bằng engine chấm local trong ai-service (POST /api/grade).
 * Dự án không dùng API AI thương mại, nên đây là chỗ thay cho "llm.service" trong sơ đồ.
 */
@Injectable()
export class GraderService {
  constructor(private readonly ai: AiServiceClient) {}

  async grade(context: GradingContext, transcript: string): Promise<GradeResult> {
    const position = Number(context.position);
    const result = await this.ai.post<Partial<GradeResult>>('/api/grade', {
      question: context.question,
      reference_answer: context.reference_answer,
      max_score: context.max_score,
      transcript,
      criteria: withExpectedContent(context.criteria, context.grading_guide, position),
      grading_notes: gradingNotesForQuestion(context.grading_guide, position),
    }, 120_000);

    if (!Array.isArray(result.criteria) || typeof result.suggested_score !== 'number') {
      throw new AiServiceError('Dịch vụ chấm AI không trả kết quả hợp lệ');
    }
    return {
      suggested_score: result.suggested_score,
      feedback_summary: result.feedback_summary ?? '',
      criteria: result.criteria,
      needs_teacher_review: result.needs_teacher_review ?? true,
      engine: result.engine || 'local-grader',
    };
  }
}
