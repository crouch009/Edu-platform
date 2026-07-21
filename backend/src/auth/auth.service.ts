import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailerService } from './mailer.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private audit: AuditService,
    private mailer: MailerService,
    private config: ConfigService,
  ) {}

  async login(email: string, password: string, totpCode: string | undefined, ip: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.status === 'suspended') {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة أو الحساب موقوف');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      await this.audit.log({ action: 'login_failed', ipAddress: ip, metadata: { email } });
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    // 2FA is enforced only once a secret has actually been configured.
    // Before that (e.g. a brand-new owner account), login proceeds normally
    // so the person can reach Settings and set 2FA up for the first time.
    if (user.totpSecret && (user.totpEnabled || user.role === 'owner')) {
      if (!totpCode) {
        return { requiresTotp: true }; // frontend should prompt for the code next
      }
      const isValid = authenticator.verify({ token: totpCode, secret: user.totpSecret });
      if (!isValid) {
        await this.audit.log({ userId: user.id, action: 'login_totp_failed', ipAddress: ip });
        throw new UnauthorizedException('كود التحقق غير صحيح');
      }
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.log({ userId: user.id, action: 'login_success', ipAddress: ip });

    const tokens = this.issueTokens(user.id, user.role, user.schoolId);
    return { ...tokens, user: { id: user.id, name: user.name, role: user.role, email: user.email } };
  }

  issueTokens(userId: string, role: string, schoolId: string) {
    const payload = { sub: userId, role, schoolId };
    return {
      accessToken: this.jwt.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwt.sign(payload, { expiresIn: '7d' }),
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken);
      if (payload.role === 'student') {
        const studentPayload = { sub: payload.sub, role: 'student', schoolId: payload.schoolId, teacherId: payload.teacherId };
        return {
          accessToken: this.jwt.sign(studentPayload, { expiresIn: '2h' }),
          refreshToken: this.jwt.sign(studentPayload, { expiresIn: '30d' }),
        };
      }
      return this.issueTokens(payload.sub, payload.role, payload.schoolId);
    } catch {
      throw new UnauthorizedException('رمز التحديث غير صالح، سجّل الدخول من جديد');
    }
  }

  /** Step 1 of enabling 2FA: generate a secret + QR code for the authenticator app */
  async generateTotpSecret(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('المستخدم غير موجود');
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, 'EduPlatform', secret);
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    // Do NOT persist yet - only saved once confirmTotp verifies the user
    // actually scanned it and can produce a valid code. This avoids locking
    // an account out of login if setup is started but abandoned.
    return { qrCodeDataUrl, secret };
  }

  /** Step 2: user enters a code from their app to confirm and activate 2FA */
  async confirmTotp(userId: string, code: string, secret: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('المستخدم غير موجود');
    const isValid = authenticator.verify({ token: code, secret });
    if (!isValid) throw new BadRequestException('كود التحقق غير صحيح');

    await this.prisma.user.update({ where: { id: userId }, data: { totpSecret: secret, totpEnabled: true } });
    await this.audit.log({ userId, action: 'totp_enabled' });
    return { enabled: true };
  }

  /** Authenticated user changes their own password, must supply the current one */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('المستخدم غير موجود');
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('كلمة المرور الحالية غير صحيحة');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.audit.log({ userId, action: 'password_changed' });
    return { success: true };
  }

  /**
   * Step 1 of "forgot password": always responds with a generic success
   * message regardless of whether the email exists, to avoid leaking
   * which emails are registered (user enumeration).
   */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await this.prisma.passwordResetToken.create({
        data: { userId: user.id, token, expiresAt },
      });

      const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:5173';
      const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
      await this.mailer.sendPasswordResetEmail(user.email, resetUrl);

      await this.audit.log({ userId: user.id, action: 'password_reset_requested' });
    }
    return { message: 'إذا كان البريد الإلكتروني مسجلًا لدينا، ستصلك رسالة تحتوي على رابط إعادة التعيين' };
  }

  /** Step 2: user submits the token from the email + a new password */
  async resetPassword(token: string, newPassword: string) {
    const resetToken = await this.prisma.passwordResetToken.findUnique({ where: { token } });
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('رابط إعادة التعيين غير صالح أو منتهي الصلاحية');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { token }, data: { usedAt: new Date() } }),
    ]);

    await this.audit.log({ userId: resetToken.userId, action: 'password_reset_completed' });
    return { success: true };
  }

  /** Separate, lighter login for students, using credentials on the Student record itself */
  async studentLogin(email: string, password: string, ip: string) {
    const student = await this.prisma.student.findUnique({ where: { loginEmail: email } });
    if (!student || !student.passwordHash) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }
    const valid = await bcrypt.compare(password, student.passwordHash);
    if (!valid) {
      await this.audit.log({ action: 'student_login_failed', ipAddress: ip, metadata: { email } });
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    const payload = { sub: student.id, role: 'student', schoolId: student.schoolId, teacherId: student.teacherId };
    const accessToken = this.jwt.sign(payload, { expiresIn: '2h' }); // longer-lived: exam sessions can run long
    const refreshToken = this.jwt.sign(payload, { expiresIn: '30d' });

    await this.audit.log({ action: 'student_login_success', ipAddress: ip, metadata: { studentId: student.id } });

    return {
      accessToken,
      refreshToken,
      student: { id: student.id, name: student.name },
    };
  }
}
