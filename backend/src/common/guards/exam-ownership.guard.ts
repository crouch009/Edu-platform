import { CanActivate, ExecutionContext, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Ensures a curriculum/question/exam belongs to the requesting teacher's
 * own school, and to them specifically (unless they're the owner, who can
 * manage anything within their own school).
 */
@Injectable()
export class ExamOwnershipGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { sub: userId, role, schoolId } = request.user;

    const examId = request.params.examId;
    const questionId = request.params.questionId;
    const curriculumId = request.params.curriculumId;

    let record: { schoolId: string; teacherId: string } | null = null;

    if (examId) {
      record = await this.prisma.exam.findUnique({ where: { id: examId } });
      if (!record) throw new NotFoundException('الامتحان غير موجود');
    } else if (questionId) {
      record = await this.prisma.question.findUnique({ where: { id: questionId } });
      if (!record) throw new NotFoundException('السؤال غير موجود');
    } else if (curriculumId) {
      record = await this.prisma.curriculum.findUnique({ where: { id: curriculumId } });
      if (!record) throw new NotFoundException('المنهج غير موجود');
    }

    if (!record) return true;

    if (record.schoolId !== schoolId) {
      throw new ForbiddenException('هذا المورد غير تابع لمدرستك');
    }
    if (role === 'teacher' && record.teacherId !== userId) {
      throw new ForbiddenException('هذا المورد غير تابع لك');
    }
    return true;
  }
}
