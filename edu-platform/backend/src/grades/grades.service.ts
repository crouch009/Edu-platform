import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateSubjectDto, CreateAssessmentDto, SubmitGradesDto } from './dto/grades.dto';

@Injectable()
export class GradesService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  // ---------- Subjects ----------

  async createSubject(dto: CreateSubjectDto, actingUserId: string, schoolId: string, actingRole: string) {
    const teacherId = actingRole === 'teacher' ? actingUserId : dto.teacherId;
    if (!teacherId) throw new NotFoundException('يجب تحديد المعلم المسؤول عن المادة');

    const teacher = await this.prisma.user.findUnique({ where: { id: teacherId } });
    if (!teacher || teacher.schoolId !== schoolId || teacher.role !== 'teacher') {
      throw new NotFoundException('المعلم المحدد غير موجود في مدرستك');
    }
    const subject = await this.prisma.subject.create({
      data: { name: dto.name, teacherId, schoolId },
    });
    await this.audit.log({ userId: actingUserId, action: 'subject_created', resourceType: 'subject', resourceId: subject.id });
    return subject;
  }

  async findSubjectsForUser(userId: string, role: string, schoolId: string) {
    if (role === 'owner') {
      return this.prisma.subject.findMany({
        where: { schoolId },
        include: { teacher: { select: { name: true } }, _count: { select: { assessments: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }
    if (role === 'teacher') {
      return this.prisma.subject.findMany({
        where: { teacherId: userId, schoolId },
        include: { _count: { select: { assessments: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }
    // Parents don't browse subjects directly - they see grades per child instead
    return [];
  }

  async removeSubject(subjectId: string, actingUserId: string) {
    await this.prisma.subject.delete({ where: { id: subjectId } });
    await this.audit.log({ userId: actingUserId, action: 'subject_deleted', resourceType: 'subject', resourceId: subjectId });
    return { deleted: true };
  }

  // ---------- Assessments ----------

  async createAssessment(subjectId: string, dto: CreateAssessmentDto, actingUserId: string, schoolId: string) {
    const assessment = await this.prisma.assessment.create({
      data: {
        subjectId,
        title: dto.title,
        type: dto.type,
        maxScore: dto.maxScore,
        date: new Date(dto.date),
        teacherId: actingUserId,
        schoolId,
      },
    });
    await this.audit.log({ userId: actingUserId, action: 'assessment_created', resourceType: 'assessment', resourceId: assessment.id });
    return assessment;
  }

  async findAssessmentsForSubject(subjectId: string) {
    return this.prisma.assessment.findMany({
      where: { subjectId },
      include: { grades: true },
      orderBy: { date: 'desc' },
    });
  }

  async removeAssessment(assessmentId: string, actingUserId: string) {
    await this.prisma.assessment.delete({ where: { id: assessmentId } });
    await this.audit.log({ userId: actingUserId, action: 'assessment_deleted', resourceType: 'assessment', resourceId: assessmentId });
    return { deleted: true };
  }

  // ---------- Grades ----------

  /** Bulk upsert of grades for every student in the class, for a single assessment */
  async submitGrades(assessmentId: string, dto: SubmitGradesDto, actingUserId: string) {
    const assessment = await this.prisma.assessment.findUnique({ where: { id: assessmentId } });
    if (!assessment) throw new NotFoundException('التقييم غير موجود');

    for (const entry of dto.grades) {
      if (entry.score > assessment.maxScore) {
        throw new ForbiddenException(`الدرجة (${entry.score}) أكبر من الدرجة النهائية (${assessment.maxScore})`);
      }
    }

    const results = await this.prisma.$transaction(
      dto.grades.map(entry =>
        this.prisma.grade.upsert({
          where: { assessmentId_studentId: { assessmentId, studentId: entry.studentId } },
          update: { score: entry.score, feedback: entry.feedback, gradedAt: new Date() },
          create: { assessmentId, studentId: entry.studentId, score: entry.score, feedback: entry.feedback },
        }),
      ),
    );

    await this.audit.log({
      userId: actingUserId,
      action: 'grades_submitted',
      resourceType: 'assessment',
      resourceId: assessmentId,
      metadata: { count: results.length },
    });

    return results;
  }

  /** Full grade history + per-subject averages for one student (used by teacher/parent/owner views) */
  async getStudentGrades(studentId: string) {
    const grades = await this.prisma.grade.findMany({
      where: { studentId },
      include: {
        assessment: {
          include: { subject: { select: { id: true, name: true } } },
        },
      },
      orderBy: { gradedAt: 'desc' },
    });

    const bySubject: Record<string, { subjectName: string; totalScore: number; totalMax: number; entries: any[] }> = {};

    for (const g of grades) {
      const subjectId = g.assessment.subject.id;
      if (!bySubject[subjectId]) {
        bySubject[subjectId] = { subjectName: g.assessment.subject.name, totalScore: 0, totalMax: 0, entries: [] };
      }
      bySubject[subjectId].totalScore += g.score;
      bySubject[subjectId].totalMax += g.assessment.maxScore;
      bySubject[subjectId].entries.push({
        id: g.id,
        title: g.assessment.title,
        type: g.assessment.type,
        score: g.score,
        maxScore: g.assessment.maxScore,
        feedback: g.feedback,
        date: g.assessment.date,
      });
    }

    const subjects = Object.entries(bySubject).map(([subjectId, data]) => ({
      subjectId,
      subjectName: data.subjectName,
      averagePercent: data.totalMax > 0 ? Math.round((data.totalScore / data.totalMax) * 1000) / 10 : 0,
      entries: data.entries,
    }));

    const overallTotalScore = grades.reduce((s, g) => s + g.score, 0);
    const overallTotalMax = grades.reduce((s, g) => s + g.assessment.maxScore, 0);
    const overallAveragePercent = overallTotalMax > 0 ? Math.round((overallTotalScore / overallTotalMax) * 1000) / 10 : 0;

    return { subjects, overallAveragePercent };
  }
}
