import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/students.dto';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  /** Returns students scoped to the requesting user's role, always within their own school */
  async findAllForUser(userId: string, role: string, schoolId: string) {
    if (role === 'owner') {
      return this.prisma.student.findMany({
        where: { schoolId },
        include: { teacher: { select: { name: true } }, parent: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }
    if (role === 'teacher') {
      return this.prisma.student.findMany({
        where: { teacherId: userId, schoolId },
        include: { parent: { select: { name: true, email: true } }, reports: { select: { id: true, title: true, status: true, createdAt: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }
    // parent
    return this.prisma.student.findMany({
      where: { parentId: userId, schoolId },
      include: { teacher: { select: { name: true } }, reports: { where: { status: 'published' } } },
    });
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        teacher: { select: { name: true, email: true } },
        parent: { select: { name: true, email: true } },
        reports: { orderBy: { createdAt: 'desc' }, include: { files: true } },
      },
    });
    if (!student) throw new NotFoundException('الطالب غير موجود');
    return student;
  }

  async create(dto: CreateStudentDto, actingUserId: string, schoolId: string) {
    // Ensure the assigned teacher actually belongs to the acting owner's/teacher's school
    const teacher = await this.prisma.user.findUnique({ where: { id: dto.teacherId } });
    if (!teacher || teacher.schoolId !== schoolId) {
      throw new NotFoundException('المعلم المحدد غير موجود في مدرستك');
    }
    if (dto.parentId) {
      const parent = await this.prisma.user.findUnique({ where: { id: dto.parentId } });
      if (!parent || parent.schoolId !== schoolId) {
        throw new NotFoundException('ولي الأمر المحدد غير موجود في مدرستك');
      }
    }

    const student = await this.prisma.student.create({ data: { ...dto, schoolId } });
    await this.audit.log({ userId: actingUserId, action: 'student_created', resourceType: 'student', resourceId: student.id });
    return student;
  }

  async update(id: string, dto: UpdateStudentDto, actingUserId: string) {
    const student = await this.prisma.student.update({ where: { id }, data: dto });
    await this.audit.log({ userId: actingUserId, action: 'student_updated', resourceType: 'student', resourceId: id });
    return student;
  }

  async remove(id: string, actingUserId: string) {
    await this.prisma.student.delete({ where: { id } });
    await this.audit.log({ userId: actingUserId, action: 'student_deleted', resourceType: 'student', resourceId: id });
    return { deleted: true };
  }
}
