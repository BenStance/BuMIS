import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../../database/entities/role.entity';
import { Permission } from '../../database/entities/permission.entity';
import { RolePermission } from '../../database/entities/role-permission.entity';
import { User } from '../../database/entities/user.entity';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, RolePermission, User])],
  controllers: [RolesController],
  providers: [RolesService, PermissionsGuard],
  exports: [RolesService, TypeOrmModule],
})
export class RolesModule {}
