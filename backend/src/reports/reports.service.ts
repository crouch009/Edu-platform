import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailerService } from '../auth/mailer.service';
import { SmsService } from '../auth/sms.service';
import { ConfigService } from '@nestjs/config';
import { CreateReportDto, UpdateReportDto } from './dto/reports.dto';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private mailer: MailerService,
    private sms: SmsService,
    private config: ConfigService,
  ) {}

  async create(dto: CreateReportDto, teacherId: string) {
    const report = await this.prisma.report.create({
      data: { ...dto, teacherId },
    });
    await this.audit.log({ userId: teacherId, action: 'report_created', resourceType: 'report', resourceId: report.id });
    return report;
  }

  async findOne(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: { files: true, student: { select: { name: true, teacherId: true, parentId: true } } },
    });
    if (!report) throw new NotFoundException('التقرير غير موجود');
    return report;
  }

  async update(id: string, dto: UpdateReportDto, actingUserId: string) {
    const previous = await this.prisma.report.findUnique({ where: { id } });
    const report = await this.prisma.report.update({ where: { id }, data: dto });
    await this.audit.log({ userId: actingUserId, action: 'report_updated', resourceType: 'report', resourceId: id, metadata: dto });

    const justPublished = previous?.status !== 'published' && report.status === 'published';
    if (justPublished) {
      await this.notifyParentOfPublishedReport(report.id);
    }

    return report;
  }

  /** Sends an email to the linked parent (if any) once a report is published */
  private async notifyParentOfPublishedReport(reportId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { student: { include: { parent: true } } },
    });
    const parent = report?.student.parent;
    if (!parent) return; // no parent account linked yet - nothing to notify

    const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:5173';
    const reportUrl = `${frontendUrl}/parent/reports/${reportId}`;
    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>تقرير جديد لـ ${report.student.name}</h2>
        <p>قام المعلم بنشر تقرير جديد بعنوان "${report.title}".</p>
        <p><a href="${reportUrl}">اضغط هنا لعرض التقرير</a></p>
      </div>
    `;
    await this.mailer.sendMail(parent.email, `تقرير جديد لـ ${report.student.name}`, html);
    await this.audit.log({ action: 'notification_sent', resourceType: 'report', resourceId: reportId, metadata: { to: parent.email, channel: 'email' } });

    if (parent.phone) {
      const smsBody = `تقرير جديد لـ ${report.student.name}: ${report.title}. عرض التقرير: ${reportUrl}`;
      await this.sms.sendSms(parent.phone, smsBody);
      await this.audit.log({ action: 'notification_sent', resourceType: 'report', resourceId: reportId, metadata: { to: parent.phone, channel: 'sms' } });
    }
  }

  async remove(id: string, actingUserId: string) {
    await this.prisma.report.delete({ where: { id } });
    await this.audit.log({ userId: actingUserId, action: 'report_deleted', resourceType: 'report', resourceId: id });
    return { deleted: true };
  }

  /** Generates a time-limited share link a teacher can send to a parent */
  async createShareLink(reportId: string, createdBy: string, expiresInMinutes = 60 * 24 * 7) {
    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    const link = await this.prisma.shareLink.create({
      data: { reportId, token, expiresAt, createdBy },
    });
    await this.audit.log({ userId: createdBy, action: 'share_link_created', resourceType: 'report', resourceId: reportId, metadata: { expiresAt } });
    return link;
  }

  /** Public resolution of a share link token - no auth required, but must not be expired */
  async resolveShareLink(token: string) {
    const link = await this.prisma.shareLink.findUnique({
      where: { token },
      include: { report: { include: { files: true, student: { select: { name: true } } } } },
    });
    if (!link) throw new NotFoundException('الرابط غير صالح');
    if (link.expiresAt < new Date()) throw new ForbiddenException('انتهت صلاحية هذا الرابط');
    return link.report;
  }
}
