import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/students.dto';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService, private audit: AuditService, private jwt: JwtService) {}

  /** Returns students scoped to the requesting user's role, always within their own school */
  async findAllForUser(userId: string, role: string, schoolId: string) {
    let students;
    if (role === 'owner') {
      students = await this.prisma.student.findMany({
        where: { schoolId },
        include: { teacher: { select: { name: true } }, parent: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    } else if (role === 'teacher') {
      students = await this.prisma.student.findMany({
        where: { teacherId: userId, schoolId },
        include: { parent: { select: { name: true, email: true } }, reports: { select: { id: true, title: true, status: true, createdAt: true } } },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // parent
      students = await this.prisma.student.findMany({
        where: { parentId: userId, schoolId },
        include: { teacher: { select: { name: true } }, reports: { where: { status: 'published' } } },
      });
    }
    return students.map(({ passwordHash, ...safe }) => safe);
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
    const { passwordHash, ...safeStudent } = student;
    return safeStudent;
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

  /** Teacher/owner sets or resets a student's own login credentials for taking exams */
  async setLoginCredentials(studentId: string, email: string, password: string, actingUserId: string) {
    const existing = await this.prisma.student.findUnique({ where: { loginEmail: email } });
    if (existing && existing.id !== studentId) {
      throw new ConflictException('هذا البريد الإلكتروني مستخدم لطالب آخر بالفعل');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const student = await this.prisma.student.update({
      where: { id: studentId },
      data: { loginEmail: email, passwordHash },
      select: { id: true, name: true, loginEmail: true },
    });
    await this.audit.log({ userId: actingUserId, action: 'student_credentials_set', resourceType: 'student', resourceId: studentId });
    return student;
  }

  /** Owner-only: view the platform as a specific student, for support/testing */
  async impersonate(studentId: string, actingOwnerId: string, schoolId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.schoolId !== schoolId) {
      throw new NotFoundException('الطالب غير موجود في مدرستك');
    }

    const payload = { sub: student.id, role: 'student', schoolId, teacherId: student.teacherId };
    const accessToken = this.jwt.sign(payload, { expiresIn: '30m' });

    await this.audit.log({
      userId: actingOwnerId,
      action: 'student_impersonated',
      resourceType: 'student',
      resourceId: student.id,
    });

    return { accessToken, student: { id: student.id, name: student.name } };
  }
}
