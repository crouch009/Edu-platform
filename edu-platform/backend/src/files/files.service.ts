import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'video/mp4',
  'video/quicktime',
];

const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024; // 200MB, adjust per hosting plan

@Injectable()
export class FilesService {
  private s3: S3Client;
  private bucket: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private audit: AuditService,
  ) {
    const endpoint = this.config.get<string>('R2_ENDPOINT');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    const bucket = this.config.get<string>('R2_BUCKET');

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error(
        'Missing R2 configuration. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, ' +
        'and R2_BUCKET in backend/.env before starting the server (see README for setup steps).',
      );
    }

    this.s3 = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
    this.bucket = bucket;
  }

  async uploadReportFile(reportId: string, file: Express.Multer.File, uploadedBy: string) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('نوع الملف غير مسموح به. الأنواع المسموحة: PDF, Word, PowerPoint, فيديو');
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('حجم الملف يتجاوز الحد المسموح (200 ميجابايت)');
    }

    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_\u0600-\u06FF]/g, '_');
    const key = `reports/${reportId}/${Date.now()}-${safeName}`;

    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ServerSideEncryption: 'AES256',
    }));

    const record = await this.prisma.reportFile.create({
      data: {
        reportId,
        fileKey: key,
        fileType: file.mimetype,
        fileSize: file.size,
        uploadedBy,
      },
    });

    await this.audit.log({
      userId: uploadedBy,
      action: 'file_uploaded',
      resourceType: 'report_file',
      resourceId: record.id,
      metadata: { fileType: file.mimetype, fileSize: file.size },
    });

    return record;
  }

  /** Generates a short-lived signed URL - never expose the raw bucket URL to clients */
  async getTemporaryDownloadUrl(fileId: string, requestedBy: string) {
    const file = await this.prisma.reportFile.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('الملف غير موجود');

    const command = new GetObjectCommand({ Bucket: this.bucket, Key: file.fileKey });
    const url = await getSignedUrl(this.s3, command, { expiresIn: 900 }); // 15 minutes

    await this.audit.log({
      userId: requestedBy,
      action: 'file_download_link_generated',
      resourceType: 'report_file',
      resourceId: fileId,
    });

    return { url, expiresInSeconds: 900 };
  }

  async remove(fileId: string, actingUserId: string) {
    const file = await this.prisma.reportFile.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('الملف غير موجود');

    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: file.fileKey }));
    await this.prisma.reportFile.delete({ where: { id: fileId } });

    await this.audit.log({ userId: actingUserId, action: 'file_deleted', resourceType: 'report_file', resourceId: fileId });
    return { deleted: true };
  }
}
