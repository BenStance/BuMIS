import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../../database/entities/user.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { EmailOtp } from '../../database/entities/email-otp.entity';
import { Business } from '../../database/entities/business.entity';
import { BusinessSubscription } from '../../database/entities/business-subscription.entity';
import { SubscriptionPlan } from '../../database/entities/subscription-plan.entity';
import { Role } from '../../database/entities/role.entity';
import { Permission } from '../../database/entities/permission.entity';
import { RolePermission } from '../../database/entities/role-permission.entity';
import { UserPermission } from '../../database/entities/user-permission.entity';
import { MailerService } from '../../common/services/mailer.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      RefreshToken,
      EmailOtp,
      Business,
      BusinessSubscription,
      SubscriptionPlan,
      Role,
      Permission,
      RolePermission,
      UserPermission,
    ]),
    PassportModule,
    JwtModule.register({}),
    AuditModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, MailerService],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule {}
