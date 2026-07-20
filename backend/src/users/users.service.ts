import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async create(dto: CreateUserDto, actingUserId: string, schoolId: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('البريد الإلكتروني مستخدم بالفعل');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: dto.role,
        phone: dto.phone,
        schoolId, // always the acting owner's own school - never client-supplied
      },
      select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
    });

    await this.audit.log({
      userId: actingUserId,
      action: 'user_created',
      resourceType: 'user',
      resourceId: user.id,
      metadata: { role: dto.role },
    });

    return user;
  }

  async findAll(schoolId: string) {
    return this.prisma.user.findMany({
      where: { schoolId },
      select: {
        id: true, email: true, name: true, role: true, status: true,
        totpEnabled: true, createdAt: true, lastLoginAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdateUserDto, actingUserId: string, schoolId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.schoolId !== schoolId) throw new NotFoundException('المستخدم غير موجود');

    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    await this.audit.log({
      userId: actingUserId,
      action: 'user_updated',
      resourceType: 'user',
      resourceId: id,
      metadata: dto,
    });

    return updated;
  }

  async remove(id: string, actingUserId: string, schoolId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.schoolId !== schoolId) throw new NotFoundException('المستخدم غير موجود');

    await this.prisma.user.delete({ where: { id } });
    await this.audit.log({
      userId: actingUserId,
      action: 'user_deleted',
      resourceType: 'user',
      resourceId: id,
    });
    return { deleted: true };
  }

  /** Metrics for the owner dashboard, scoped to their school only */
  async getDashboardMetrics(schoolId: string) {
    const [teacherCount, parentCount, activeUserCount, reportCount, totalFileSize] = await Promise.all([
      this.prisma.user.count({ where: { role: 'teacher', schoolId } }),
      this.prisma.user.count({ where: { role: 'parent', schoolId } }),
      this.prisma.user.count({ where: { status: 'active', schoolId } }),
      this.prisma.report.count({ where: { student: { schoolId } } }),
      this.prisma.reportFile.aggregate({
        _sum: { fileSize: true },
        where: { report: { student: { schoolId } } },
      }),
    ]);

    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentLogins = await this.prisma.auditLog.count({
      where: { action: 'login_success', createdAt: { gte: last30Days }, user: { schoolId } },
    });

    return {
      teacherCount,
      parentCount,
      activeUserCount,
      reportCount,
      totalStorageBytes: totalFileSize._sum.fileSize ?? 0,
      loginsLast30Days: recentLogins,
    };
  }
}
