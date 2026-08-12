import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentCounter } from '../../database/entities/document-counter.entity';
import { DocumentNumberingService } from './document-numbering.service';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentCounter])],
  providers: [DocumentNumberingService],
  exports: [DocumentNumberingService],
})
export class DocumentNumberingModule {}
