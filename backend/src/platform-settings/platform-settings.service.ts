import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

@Injectable()
export class PlatformSettingsService {
  private s3: S3Client | null = null;
  private bucket: string | undefined;

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private config: ConfigService,
  ) {
    const endpoint = this.config.get<string>('R2_ENDPOINT');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucket = this.config.get<string>('R2_BUCKET');
    if (endpoint && accessKeyId && secretAccessKey) {
      this.s3 = new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId, secretAccessKey } });
    }
  }

  private settingKey(schoolId: string) {
    return `branding:${schoolId}`;
  }

  async get(schoolId: string) {
    const record = await this.prisma.platformSetting.findUnique({ where: { key: this.settingKey(schoolId) } });
    return (record?.value as any) ?? { siteName: null, logoUrl: null };
  }

  async update(schoolId: string, siteName: string | undefined, actingUserId: string) {
    const current = await this.get(schoolId);
    const value = { ...current, ...(siteName !== undefined ? { siteName } : {}) };

    await this.prisma.platformSetting.upsert({
      where: { key: this.settingKey(schoolId) },
      update: { value, updatedBy: actingUserId },
      create: { key: this.settingKey(schoolId), value, updatedBy: actingUserId },
    });

    await this.audit.log({ userId: actingUserId, action: 'platform_settings_updated', metadata: { siteName } });
    return value;
  }

  async uploadLogo(schoolId: string, file: Express.Multer.File, actingUserId: string) {
    if (!this.s3 || !this.bucket) {
      throw new BadRequestException('تخزين الملفات (R2) غير مُعد على هذا الخادم بعد');
    }
    if (!ALLOWED_LOGO_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('صيغة الصورة غير مدعومة (PNG, JPEG, WEBP, SVG فقط)');
    }

    const key = `platform/${schoolId}/logo-${Date.now()}`;
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ServerSideEncryption: 'AES256',
    }));

    // Logos are meant to be publicly visible in the UI (like a favicon),
    // so we store a stable proxy URL through our own API instead of a
    // presigned link that would expire.
    const logoUrl = `/api/platform-settings/logo/${schoolId}`;

    const current = await this.get(schoolId);
    const value = { ...current, logoUrl, logoKey: key };
    await this.prisma.platformSetting.upsert({
      where: { key: this.settingKey(schoolId) },
      update: { value, updatedBy: actingUserId },
      create: { key: this.settingKey(schoolId), value, updatedBy: actingUserId },
    });

    await this.audit.log({ userId: actingUserId, action: 'platform_logo_updated' });
    return value;
  }

  getS3Client() {
    return this.s3;
  }
  getBucket() {
    return this.bucket;
  }
}
