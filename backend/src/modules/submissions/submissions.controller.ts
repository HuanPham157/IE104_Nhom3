import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { z } from 'zod';
import type { AuthContext } from '../../common/auth/auth.types';
import { CurrentUser, Roles } from '../../common/auth/roles.decorator';
import { JsonBody } from '../../common/http/json-body.decorator';
import { parseBody, uuidParam } from '../../common/http/validation';
import { MAX_AUDIO_BYTES, SubmissionsService } from './submissions.service';

const assignmentId = uuidParam('ID bài tập không hợp lệ');
const answerId = uuidParam('ID câu trả lời không hợp lệ');

const uploadSchema = z.object({
  question_id: z.string().uuid(),
  duration_seconds: z.coerce.number().int().positive().max(7200).optional(),
});

const submitSchema = z.object({
  assignment_submission_id: z.string().uuid(),
  // Transcript sinh viên đã sửa / tự gõ cho các bản được chọn — lưu trước khi khóa bài.
  transcripts: z.array(z.object({
    submission_id: z.string().uuid(),
    transcript_text: z.string().trim().min(1).max(50000),
  }).strict()).max(100).optional().default([]),
}).strict();

/** Luồng làm bài của sinh viên: bắt đầu, ghi âm, chọn bản, nộp bài, theo dõi trạng thái xử lý. */
@Controller()
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Post('assignments/:id/start')
  @Roles('student')
  async start(@CurrentUser() auth: AuthContext, @Param('id', assignmentId) id: string) {
    return { data: await this.submissions.start(auth, id) };
  }

  @Post('assignments/:id/retake')
  @Roles('student')
  async retake(@CurrentUser() auth: AuthContext, @Param('id', assignmentId) id: string) {
    return { data: await this.submissions.retake(auth, id) };
  }

  @Post('assignments/:id/answers')
  @Roles('student')
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: MAX_AUDIO_BYTES, files: 1 } }))
  async upload(
    @CurrentUser() auth: AuthContext,
    @Param('id', assignmentId) id: string,
    @UploadedFile() audio: Express.Multer.File | undefined,
    @Body() body: unknown,
  ) {
    const parsed = parseBody(uploadSchema, body, 'Cần cung cấp câu hỏi hợp lệ và thời lượng ghi âm hợp lệ');
    if (!audio) throw new BadRequestException('Cần cung cấp câu hỏi và tệp ghi âm');
    return {
      data: await this.submissions.uploadAnswer(auth, id, parsed.question_id, audio, parsed.duration_seconds ?? null),
    };
  }

  @Post('assignments/:id/submit')
  @Roles('student')
  @HttpCode(200)
  async submit(@CurrentUser() auth: AuthContext, @Param('id', assignmentId) id: string, @JsonBody() body: unknown) {
    const parsed = parseBody(submitSchema, body, 'Dữ liệu nộp bài không hợp lệ');
    return { data: await this.submissions.submit(auth, id, parsed.assignment_submission_id, parsed.transcripts) };
  }

  @Post('submissions/:id/select')
  @Roles('student')
  @HttpCode(200)
  async select(@CurrentUser() auth: AuthContext, @Param('id', answerId) id: string) {
    return { data: await this.submissions.selectVersion(auth, id) };
  }

  @Post('submissions/:id/transcribe')
  @Roles('student')
  @HttpCode(202)
  async transcribe(@CurrentUser() auth: AuthContext, @Param('id', answerId) id: string) {
    return { data: await this.submissions.requestTranscription(auth, id) };
  }

  @Get('submissions/:id/status')
  @Roles('student', 'lecturer', 'admin')
  async status(@CurrentUser() auth: AuthContext, @Param('id', answerId) id: string) {
    return { data: await this.submissions.status(auth, id) };
  }
}
