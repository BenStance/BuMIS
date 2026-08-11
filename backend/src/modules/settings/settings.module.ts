import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../../database/entities/business.entity';
import { SystemSetting } from '../../database/entities/system-setting.entity';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Business, SystemSetting]), AuditModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
