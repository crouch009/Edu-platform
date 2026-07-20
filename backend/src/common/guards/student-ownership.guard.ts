import { CanActivate, ExecutionContext, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Ensures the requesting teacher/parent actually owns the student
 * referenced in the route (:studentId) or via the report's studentId
 * (:reportId). Owners bypass this check entirely.
 */
@Injectable()
export class StudentOwnershipGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { sub: userId, role, schoolId } = request.user;

    let studentId = request.params.studentId;

    // If we only have a reportId, resolve the studentId through it
    if (!studentId && request.params.reportId) {
      const report = await this.prisma.report.findUnique({
        where: { id: request.params.reportId },
      });
      if (!report) throw new NotFoundException('التقرير غير موجود');
      studentId = report.studentId;
    }

    if (!studentId) return true; // route doesn't touch a specific student

    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('الطالب غير موجود');

    // Every role, including owner, is confined to its own school (tenant isolation)
    if (student.schoolId !== schoolId) {
      throw new ForbiddenException('هذا الطالب غير تابع لمدرستك');
    }

    if (role === 'owner') return true; // within-school owners see all of their school's data

    if (role === 'teacher' && student.teacherId !== userId) {
      throw new ForbiddenException('هذا الطالب غير تابع لك');
    }
    if (role === 'parent' && student.parentId !== userId) {
      throw new ForbiddenException('غير مصرح لك بالوصول لهذا الطالب');
    }
    return true;
  }
}
