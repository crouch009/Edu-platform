import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface LogParams {
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: LogParams) {
    return this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        ipAddress: params.ipAddress,
        metadata: params.metadata ?? undefined,
      },
    });
  }

  async findAll(filters: { userId?: string; action?: string; from?: Date; to?: Date; schoolId?: string }) {
    return this.prisma.auditLog.findMany({
      where: {
        userId: filters.userId,
        action: filters.action ? { contains: filters.action } : undefined,
        createdAt: {
          gte: filters.from,
          lte: filters.to,
        },
        user: filters.schoolId ? { schoolId: filters.schoolId } : undefined,
      },
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
