import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /** Reports created per month, last 6 months, for the owner's school */
  async reportsOverTime(schoolId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const reports = await this.prisma.report.findMany({
      where: { student: { schoolId }, createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    });

    const buckets: Record<string, number> = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo);
      d.setMonth(d.getMonth() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = 0;
    }
    reports.forEach(r => {
      const d = r.createdAt;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key in buckets) buckets[key]++;
    });

    return Object.entries(buckets).map(([month, count]) => ({ month, count }));
  }

  /** Most active teachers by report count, for the owner's school */
  async teacherActivity(schoolId: string) {
    const teachers = await this.prisma.user.findMany({
      where: { role: 'teacher', schoolId },
      select: {
        id: true,
        name: true,
        _count: { select: { reportsAuthored: true, studentsAsTeacher: true } },
      },
    });

    return teachers
      .map(t => ({
        teacherId: t.id,
        name: t.name,
        reportCount: t._count.reportsAuthored,
        studentCount: t._count.studentsAsTeacher,
      }))
      .sort((a, b) => b.reportCount - a.reportCount);
  }

  /** Storage usage growth per month, last 6 months, for the owner's school */
  async storageGrowth(schoolId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const files = await this.prisma.reportFile.findMany({
      where: { report: { student: { schoolId } }, createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, fileSize: true },
    });

    const buckets: Record<string, number> = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo);
      d.setMonth(d.getMonth() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = 0;
    }
    files.forEach(f => {
      const d = f.createdAt;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key in buckets) buckets[key] += f.fileSize;
    });

    return Object.entries(buckets).map(([month, bytes]) => ({
      month,
      megabytes: Math.round((bytes / (1024 * 1024)) * 10) / 10,
    }));
  }

  /** Report status breakdown (draft vs published) */
  async reportStatusBreakdown(schoolId: string) {
    const [draft, published] = await Promise.all([
      this.prisma.report.count({ where: { student: { schoolId }, status: 'draft' } }),
      this.prisma.report.count({ where: { student: { schoolId }, status: 'published' } }),
    ]);
    return { draft, published };
  }
}
