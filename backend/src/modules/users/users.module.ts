import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { Permission } from '../../database/entities/permission.entity';
import { UserPermission } from '../../database/entities/user-permission.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MailerService } from '../../common/services/mailer.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Permission, UserPermission])],
  controllers: [UsersController],
  providers: [UsersService, MailerService, PermissionsGuard],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
