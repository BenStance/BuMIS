import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../../database/entities/business.entity';
import { BusinessSubscription } from '../../database/entities/business-subscription.entity';
import { User } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Business, BusinessSubscription, User, Role]), AuthModule],
  controllers: [BusinessController],
  providers: [BusinessService, PermissionsGuard],
  exports: [BusinessService, TypeOrmModule],
})
export class BusinessModule {}
