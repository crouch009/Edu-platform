import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { JwtConfigModule } from './common/jwt-config.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StudentsModule } from './students/students.module';
import { ReportsModule } from './reports/reports.module';
import { FilesModule } from './files/files.module';
import { AuditModule } from './audit/audit.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { GradesModule } from './grades/grades.module';
import { ExamsModule } from './exams/exams.module';
import { PlatformSettingsModule } from './platform-settings/platform-settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]), // basic rate limiting
    PrismaModule,
    JwtConfigModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    ReportsModule,
    FilesModule,
    AuditModule,
    AnalyticsModule,
    GradesModule,
    ExamsModule,
    PlatformSettingsModule,
  ],
})
export class AppModule {}
