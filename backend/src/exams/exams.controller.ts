import { Body, Controller, Delete, Get, Param, Post, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ExamOwnershipGuard } from '../common/guards/exam-ownership.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ExamsService } from './exams.service';
import { TextExtractionService } from './text-extraction.service';
import { QuestionImportService } from './question-import.service';
import {
  CreateCurriculumDto, CreateQuestionDto, GenerateQuestionsDto,
  CreateExamDto,
} from './dto/exams.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamsController {
  constructor(
    private examsService: ExamsService,
    private textExtraction: TextExtractionService,
    private questionImport: QuestionImportService,
  ) {}

  // ---------- File-based text extraction (for curriculum upload) ----------

  @Post('curricula/extract-text')
  @Roles('owner', 'teacher')
  @UseInterceptors(FileInterceptor('file'))
  async extractText(@UploadedFile() file: Express.Multer.File) {
    const text = await this.textExtraction.extractText(file);
    return { text };
  }

  // ---------- Bulk question import from a formatted file, straight into an exam ----------

  @Post('exams/import')
  @Roles('owner', 'teacher')
  @UseInterceptors(FileInterceptor('file'))
  async importExam(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
    @Body('duration') duration: string,
    @CurrentUser() user: any,
  ) {
    const rawText = await this.textExtraction.extractText(file);
    const parsedQuestions = this.questionImport.parse(rawText);
    return this.examsService.createExamFromImport(title, Number(duration), parsedQuestions, user.sub, user.schoolId);
  }

  // ---------- Curricula ----------

  @Get('curricula')
  findCurricula(@CurrentUser() user: any) {
    return this.examsService.findCurricula(user.sub, user.role, user.schoolId);
  }

  @Post('curricula')
  @Roles('owner', 'teacher')
  createCurriculum(@Body() dto: CreateCurriculumDto, @CurrentUser() user: any) {
    return this.examsService.createCurriculum(dto, user.sub, user.schoolId);
  }

  @Delete('curricula/:curriculumId')
  @Roles('owner', 'teacher')
  @UseGuards(ExamOwnershipGuard)
  removeCurriculum(@Param('curriculumId') curriculumId: string, @CurrentUser() user: any) {
    return this.examsService.removeCurriculum(curriculumId, user.sub);
  }

  // ---------- AI / heuristic question generation (preview, not saved yet) ----------

  @Post('questions/generate/ai')
  @Roles('owner', 'teacher')
  generateWithAi(@Body() dto: GenerateQuestionsDto) {
    return this.examsService.generateQuestions(dto, 'ai');
  }

  @Post('questions/generate/heuristic')
  @Roles('owner', 'teacher')
  generateHeuristic(@Body() dto: GenerateQuestionsDto) {
    return this.examsService.generateQuestions(dto, 'heuristic');
  }

  // ---------- Questions ----------

  @Get('questions')
  findQuestions(@CurrentUser() user: any) {
    return this.examsService.findQuestions(user.sub, user.role, user.schoolId);
  }

  @Post('questions')
  @Roles('owner', 'teacher')
  createQuestion(@Body() dto: CreateQuestionDto, @CurrentUser() user: any) {
    return this.examsService.createQuestion(dto, user.sub, user.schoolId);
  }

  @Post('curricula/:curriculumId/questions/bulk')
  @Roles('owner', 'teacher')
  @UseGuards(ExamOwnershipGuard)
  saveGeneratedQuestions(
    @Param('curriculumId') curriculumId: string,
    @Body('questions') questions: CreateQuestionDto[],
    @CurrentUser() user: any,
  ) {
    return this.examsService.saveGeneratedQuestions(questions, curriculumId, user.sub, user.schoolId);
  }

  @Delete('questions/:questionId')
  @Roles('owner', 'teacher')
  @UseGuards(ExamOwnershipGuard)
  removeQuestion(@Param('questionId') questionId: string, @CurrentUser() user: any) {
    return this.examsService.removeQuestion(questionId, user.sub);
  }

  // ---------- Exams ----------

  @Get('exams')
  findExams(@CurrentUser() user: any) {
    return this.examsService.findExams(user.sub, user.role, user.schoolId);
  }

  @Post('exams')
  @Roles('owner', 'teacher')
  createExam(@Body() dto: CreateExamDto, @CurrentUser() user: any) {
    return this.examsService.createExam(dto, user.sub, user.schoolId);
  }

  @Delete('exams/:examId')
  @Roles('owner', 'teacher')
  @UseGuards(ExamOwnershipGuard)
  removeExam(@Param('examId') examId: string, @CurrentUser() user: any) {
    return this.examsService.removeExam(examId, user.sub);
  }

  @Get('exams/:examId/results')
  @Roles('owner', 'teacher')
  @UseGuards(ExamOwnershipGuard)
  getExamResults(@Param('examId') examId: string) {
    return this.examsService.getExamResults(examId);
  }
}
