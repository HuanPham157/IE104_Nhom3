import { BadRequestException, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import type { AuthContext } from '../../common/auth/auth.types';
import { JsonBody } from '../../common/http/json-body.decorator';
import { CurrentUser, Roles } from '../../common/auth/roles.decorator';
import { parseBody, uuidParam } from '../../common/http/validation';
import { GradingService } from './grading.service';

const answerId = uuidParam('ID câu trả lời không hợp lệ');
const assignmentId = uuidParam('ID bài tập không hợp lệ');

const transcriptSchema = z.object({ transcript_text: z.string().trim().min(1).max(50000) }).strict();
const reviewSchema = z.object({
  final_score: z.number().min(0).max(999.99),
  reviewer_feedback: z.string().trim().max(5000).optional().nullable(),
  score_modified: z.boolean().optional().default(false),
}).strict();

/** Chấm điểm: yêu cầu AI chấm (qua hàng đợi), giảng viên xem chi tiết, sửa transcript, duyệt/sửa điểm. */
@Controller()
export class GradingController {
  constructor(private readonly grading: GradingService) {}

  /** Sinh viên thử chấm lại câu bị lỗi sau khi nộp. */
  @Post('submissions/:id/grade')
  @Roles('student')
  @HttpCode(202)
  async retryGrade(@CurrentUser() auth: AuthContext, @Param('id', answerId) id: string) {
    return { data: await this.grading.requestGrading(auth, id) };
  }

  /** Giảng viên yêu cầu AI chấm / chấm lại (thường sau khi sửa transcript). */
  @Post('submissions/:id/ai-grade')
  @Roles('lecturer', 'admin')
  @HttpCode(202)
  async aiGrade(@CurrentUser() auth: AuthContext, @Param('id', answerId) id: string) {
    return { data: await this.grading.requestGrading(auth, id) };
  }

  @Get('submissions/:id')
  @Roles('lecturer', 'admin')
  async detail(@CurrentUser() auth: AuthContext, @Param('id', answerId) id: string) {
    return { data: await this.grading.answerDetail(auth, id) };
  }

  @Post('submissions/:id/transcript')
  @Roles('lecturer', 'admin')
  @HttpCode(200)
  async transcript(@CurrentUser() auth: AuthContext, @Param('id', answerId) id: string, @JsonBody() body: unknown) {
    const parsed = parseBody(transcriptSchema, body, 'Transcript trống hoặc quá dài (tối đa 50.000 ký tự)');
    return { data: await this.grading.saveLecturerTranscript(auth, id, parsed.transcript_text) };
  }

  @Post('submissions/:id/review')
  @Roles('lecturer', 'admin')
  @HttpCode(200)
  async review(@CurrentUser() auth: AuthContext, @Param('id', answerId) id: string, @JsonBody() body: unknown) {
    const parsed = parseBody(reviewSchema, body, 'Điểm hoặc nhận xét không hợp lệ');
    if (parsed.score_modified && !parsed.reviewer_feedback) throw new BadRequestException('Cần nhập nhận xét khi điều chỉnh điểm');
    return { data: await this.grading.review(auth, id, parsed) };
  }

  @Get('assignments/:id/submissions')
  @Roles('lecturer', 'admin')
  async assignmentSubmissions(@CurrentUser() auth: AuthContext, @Param('id', assignmentId) id: string) {
    return { data: await this.grading.assignmentSubmissions(auth, id) };
  }
}
