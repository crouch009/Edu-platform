import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Every feature module that uses JwtAuthGuard or StudentJwtAuthGuard needs
 * a JwtService configured with the real secret. Making this @Global() and
 * importing it once in AppModule means every module gets the SAME properly
 * configured JwtService automatically, instead of each module importing its
 * own unconfigured `JwtModule.register({})` (which has no secret and was
 * silently rejecting every valid token as 401 Unauthorized).
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
    }),
  ],
  exports: [JwtModule],
})
export class JwtConfigModule {}
