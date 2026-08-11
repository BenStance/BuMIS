import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryTransaction } from '../../database/entities/inventory-transaction.entity';
import { Product } from '../../database/entities/product.entity';
import { Vendor } from '../../database/entities/vendor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryTransaction, Product, Vendor])],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
