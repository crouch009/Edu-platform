import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AiQuestionGeneratorService } from './ai-question-generator.service';
import { HeuristicQuestionGeneratorService } from './heuristic-question-generator.service';
import {
  CreateCurriculumDto, CreateQuestionDto, GenerateQuestionsDto,
  CreateExamDto, SubmitExamDto,
} from './dto/exams.dto';

@Injectable()
export class ExamsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private aiGenerator: AiQuestionGeneratorService,
    private heuristicGenerator: HeuristicQuestionGeneratorService,
  ) {}

  // ---------- Curricula ----------

  async createCurriculum(dto: CreateCurriculumDto, teacherId: string, schoolId: string) {
    const curriculum = await this.prisma.curriculum.create({
      data: { ...dto, teacherId, schoolId },
    });
    await this.audit.log({ userId: teacherId, action: 'curriculum_created', resourceType: 'curriculum', resourceId: curriculum.id });
    return curriculum;
  }

  async findCurricula(teacherId: string, role: string, schoolId: string) {
    const where = role === 'owner' ? { schoolId } : { teacherId, schoolId };
    return this.prisma.curriculum.findMany({
      where,
      include: { _count: { select: { questions: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeCurriculum(id: string, actingUserId: string) {
    await this.prisma.curriculum.delete({ where: { id } });
    await this.audit.log({ userId: actingUserId, action: 'curriculum_deleted', resourceType: 'curriculum', resourceId: id });
    return { deleted: true };
  }

  // ---------- Question generation (preview only, not yet saved) ----------

  async generateQuestions(dto: GenerateQuestionsDto, method: 'ai' | 'heuristic') {
    if (method === 'ai') {
      return this.aiGenerator.generate(dto.curriculumText, dto.count, dto.difficulty);
    }
    const questions = this.heuristicGenerator.generate(dto.curriculumText, dto.count);
    if (questions.length === 0) {
      throw new BadRequestException('تعذر توليد أسئلة من هذا النص، جرّب نصًا أطول');
    }
    return questions;
  }

  // ---------- Questions ----------

  async createQuestion(dto: CreateQuestionDto, teacherId: string, schoolId: string) {
    const question = await this.prisma.question.create({
      data: {
        type: dto.type,
        text: dto.text,
        options: dto.options ?? undefined,
        correctAnswer: dto.correctAnswer,
        curriculumId: dto.curriculumId,
        teacherId,
        schoolId,
      },
    });
    await this.audit.log({ userId: teacherId, action: 'question_created', resourceType: 'question', resourceId: question.id });
    return question;
  }

  /** Bulk-save a batch of AI/heuristic-generated questions, linked to a curriculum */
  async saveGeneratedQuestions(questions: CreateQuestionDto[], curriculumId: string, teacherId: string, schoolId: string) {
    const created = await this.prisma.$transaction(
      questions.map(q =>
        this.prisma.question.create({
          data: {
            type: q.type,
            text: q.text,
            options: q.options ?? undefined,
            correctAnswer: q.correctAnswer,
            curriculumId,
            teacherId,
            schoolId,
          },
        }),
      ),
    );
    await this.audit.log({ userId: teacherId, action: 'questions_bulk_saved', resourceType: 'curriculum', resourceId: curriculumId, metadata: { count: created.length } });
    return created;
  }

  async findQuestions(teacherId: string, role: string, schoolId: string) {
    const where = role === 'owner' ? { schoolId } : { teacherId, schoolId };
    return this.prisma.question.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async removeQuestion(id: string, actingUserId: string) {
    await this.prisma.question.delete({ where: { id } });
    await this.audit.log({ userId: actingUserId, action: 'question_deleted', resourceType: 'question', resourceId: id });
    return { deleted: true };
  }

  // ---------- Exams ----------

  async createExam(dto: CreateExamDto, teacherId: string, schoolId: string) {
    const exam = await this.prisma.exam.create({
      data: {
        title: dto.title,
        duration: dto.duration,
        teacherId,
        schoolId,
        questions: { connect: dto.questionIds.map(id => ({ id })) },
      },
    });
    await this.audit.log({ userId: teacherId, action: 'exam_created', resourceType: 'exam', resourceId: exam.id });
    return exam;
  }

  async findExams(teacherId: string, role: string, schoolId: string) {
    const where = role === 'owner' ? { schoolId } : { teacherId, schoolId };
    return this.prisma.exam.findMany({
      where,
      include: { questions: true, _count: { select: { results: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeExam(id: string, actingUserId: string) {
    await this.prisma.exam.delete({ where: { id } });
    await this.audit.log({ userId: actingUserId, action: 'exam_deleted', resourceType: 'exam', resourceId: id });
    return { deleted: true };
  }

  /** Creates questions + an exam from a parsed question-import file, all in one step */
  async createExamFromImport(
    title: string,
    duration: number,
    questions: { type: 'mcq' | 'truefalse' | 'short'; text: string; options?: string[]; correctAnswer: string }[],
    teacherId: string,
    schoolId: string,
  ) {
    if (!title?.trim()) throw new BadRequestException('عنوان الامتحان مطلوب');
    if (!duration || duration < 1) throw new BadRequestException('مدة الامتحان مطلوبة');

    const createdQuestions = await this.prisma.$transaction(
      questions.map(q =>
        this.prisma.question.create({
          data: {
            type: q.type,
            text: q.text,
            options: q.options ?? undefined,
            correctAnswer: q.correctAnswer,
            teacherId,
            schoolId,
          },
        }),
      ),
    );

    const exam = await this.prisma.exam.create({
      data: {
        title,
        duration,
        teacherId,
        schoolId,
        questions: { connect: createdQuestions.map(q => ({ id: q.id })) },
      },
      include: { questions: true },
    });

    await this.audit.log({
      userId: teacherId, action: 'exam_imported', resourceType: 'exam', resourceId: exam.id,
      metadata: { questionCount: createdQuestions.length },
    });

    return exam;
  }

  async getExamResults(examId: string) {
    return this.prisma.examResult.findMany({
      where: { examId },
      include: { student: { select: { name: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  // ---------- Student-facing ----------

  /** Exams available to a student = all exams created by their assigned teacher */
  async findExamsForStudent(studentId: string, teacherId: string) {
    const exams = await this.prisma.exam.findMany({
      where: { teacherId },
      include: { questions: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const myResults = await this.prisma.examResult.findMany({ where: { studentId } });
    const resultByExam = new Map(myResults.map(r => [r.examId, r]));

    return exams.map(e => ({
      id: e.id,
      title: e.title,
      duration: e.duration,
      questionCount: e.questions.length,
      completed: resultByExam.has(e.id),
      result: resultByExam.get(e.id) ?? null,
    }));
  }

  /** Exam questions for taking - correct answers stripped out */
  async getExamForTaking(examId: string, teacherId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: true },
    });
    if (!exam) throw new NotFoundException('الامتحان غير موجود');
    if (exam.teacherId !== teacherId) throw new NotFoundException('الامتحان غير موجود');

    return {
      id: exam.id,
      title: exam.title,
      duration: exam.duration,
      questions: exam.questions.map(q => ({
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.options,
      })),
    };
  }

  async submitExam(examId: string, dto: SubmitExamDto, studentId: string, teacherId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: true },
    });
    if (!exam) throw new NotFoundException('الامتحان غير موجود');
    if (exam.teacherId !== teacherId) throw new NotFoundException('الامتحان غير موجود');

    const existing = await this.prisma.examResult.findUnique({
      where: { examId_studentId: { examId, studentId } },
    });
    if (existing) throw new BadRequestException('لقد قمت بتسليم هذا الامتحان بالفعل');

    const answerMap = new Map(dto.answers.map(a => [a.questionId, a.answer]));
    let score = 0;

    for (const q of exam.questions) {
      const given = answerMap.get(q.id);
      if (given != null && this.gradeAnswer(q.type, q.correctAnswer, given)) {
        score++;
      }
    }

    const total = exam.questions.length;
    const percent = total > 0 ? Math.round((score / total) * 100) : 0;

    const result = await this.prisma.examResult.create({
      data: {
        examId,
        studentId,
        answers: dto.answers as any,
        score,
        total,
        percent,
      },
    });

    await this.audit.log({ userId: undefined, action: 'exam_submitted', resourceType: 'exam', resourceId: examId, metadata: { studentId, score, total } });
    return result;
  }

  private gradeAnswer(type: string, correctAnswer: string, given: string): boolean {
    if (type === 'mcq' || type === 'truefalse') {
      return given.trim() === correctAnswer.trim();
    }
    if (type === 'short') {
      const norm = (s: string) => s.trim().toLowerCase()
        .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه')
        .replace(/[^؀-ۿa-z0-9 ]/g, '');
      const g = norm(given);
      const c = norm(correctAnswer);
      if (!g) return false;
      const cWords = c.split(' ').filter(Boolean);
      const matched = cWords.filter(w => g.includes(w)).length;
      return g === c || (cWords.length > 0 && matched / cWords.length >= 0.7);
    }
    return false;
  }
}
