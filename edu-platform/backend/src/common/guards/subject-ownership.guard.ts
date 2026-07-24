import { CanActivate, ExecutionContext, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Ensures the requesting teacher owns the subject (or the subject behind
 * an assessment), and that it belongs to their school. Owners are
 * confined to their own school but can manage any subject within it.
 */
@Injectable()
export class SubjectOwnershipGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { sub: userId, role, schoolId } = request.user;

    let subjectId = request.params.subjectId;

    if (!subjectId && request.params.assessmentId) {
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: request.params.assessmentId },
      });
      if (!assessment) throw new NotFoundException('التقييم غير موجود');
      subjectId = assessment.subjectId;
    }

    if (!subjectId) return true;

    const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) throw new NotFoundException('المادة غير موجودة');

    if (subject.schoolId !== schoolId) {
      throw new ForbiddenException('هذه المادة غير تابعة لمدرستك');
    }
    if (role === 'teacher' && subject.teacherId !== userId) {
      throw new ForbiddenException('هذه المادة غير تابعة لك');
    }
    return true;
  }
}
