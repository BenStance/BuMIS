import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { DocumentCounter } from '../../database/entities/document-counter.entity';

type GenerateNumberOptions = {
  businessId: string;
  documentType: string;
  prefix: string;
  includeYear?: boolean;
  padding?: number;
};

@Injectable()
export class DocumentNumberingService {
  constructor(
    @InjectRepository(DocumentCounter)
    private readonly documentCountersRepository: Repository<DocumentCounter>,
    private readonly dataSource: DataSource,
  ) {}

  async generate(options: GenerateNumberOptions, manager?: EntityManager): Promise<string> {
    if (!options.businessId?.trim()) {
      throw new BadRequestException('Business context is required');
    }
    const prefix = options.prefix?.trim();
    if (!prefix) {
      throw new BadRequestException('Document prefix is required');
    }

    const run = async (repository: Repository<DocumentCounter>) => {
      const documentType = options.documentType.trim();
      const includeYear = options.includeYear ?? true;
      const padding = Math.max(Number(options.padding ?? 6), 1);

      let counter = await repository
        .createQueryBuilder('counter')
        .setLock('pessimistic_write')
        .where('counter.businessId = :businessId', { businessId: options.businessId })
        .andWhere('counter.documentType = :documentType', { documentType })
        .getOne();

      if (!counter) {
        counter = repository.create({
          businessId: options.businessId,
          documentType,
          prefix,
          includeYear,
          padding,
          nextSequence: 1,
        } as DocumentCounter);
      } else {
        counter.prefix = prefix;
        counter.includeYear = includeYear;
        counter.padding = padding;
      }

      const sequence = counter.nextSequence ?? 1;
      counter.nextSequence = sequence + 1;
      await repository.save(counter);

      const yearPrefix = includeYear ? `${new Date().getFullYear()}-` : '';
      return `${prefix}-${yearPrefix}${String(sequence).padStart(padding, '0')}`;
    };

    if (manager) {
      return run(manager.getRepository(DocumentCounter));
    }

    return this.dataSource.transaction(async (transactionManager) => run(transactionManager.getRepository(DocumentCounter)));
  }

  async ensureCounterDefaults(businessId: string, documentType: string, prefix: string): Promise<void> {
    if (!businessId || !documentType || !prefix) {
      return;
    }
    await this.documentCountersRepository.upsert(
      {
        id: randomUUID(),
        businessId,
        documentType,
        prefix,
        includeYear: true,
        padding: 6,
        nextSequence: 1,
      } as DocumentCounter,
      ['businessId', 'documentType'],
    );
  }
}
