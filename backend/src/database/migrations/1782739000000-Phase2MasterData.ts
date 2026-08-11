import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase21782739000000 implements MigrationInterface {
  name = 'Phase21782739000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ProductCategories" ADD "Code" nvarchar(50)`);
    await queryRunner.query(`ALTER TABLE "ProductCategories" ADD "DeletedAt" datetime2`);

    await queryRunner.query(`ALTER TABLE "Products" ADD "Barcode" nvarchar(100)`);
    await queryRunner.query(`ALTER TABLE "Products" ADD "Description" nvarchar(500)`);
    await queryRunner.query(`ALTER TABLE "Products" ADD "LastStockMovementAt" datetime2`);

    await queryRunner.query(`ALTER TABLE "Customers" ADD "ContactPerson" nvarchar(200)`);
    await queryRunner.query(`ALTER TABLE "Customers" ADD "TIN" nvarchar(50)`);
    await queryRunner.query(`ALTER TABLE "Customers" ADD "Notes" nvarchar(255)`);

    await queryRunner.query(`ALTER TABLE "Vendors" ADD "ContactPerson" nvarchar(200)`);
    await queryRunner.query(`ALTER TABLE "Vendors" ADD "TIN" nvarchar(50)`);
    await queryRunner.query(`ALTER TABLE "Vendors" ADD "Notes" nvarchar(255)`);

    await queryRunner.query(`ALTER TABLE "InventoryTransactions" ADD "TransactionNumber" nvarchar(50)`);
    await queryRunner.query(`ALTER TABLE "InventoryTransactions" ADD "VendorId" uniqueidentifier`);
    await queryRunner.query(`ALTER TABLE "InventoryTransactions" ADD "PreviousStock" decimal(18,3) NOT NULL CONSTRAINT "DF_InventoryTransactions_PreviousStock" DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "InventoryTransactions" ADD "NewStock" decimal(18,3) NOT NULL CONSTRAINT "DF_InventoryTransactions_NewStock" DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "InventoryTransactions" ADD "Reason" nvarchar(255)`);

    await queryRunner.query(`CREATE INDEX "IDX_ProductCategories_Code" ON "ProductCategories" ("Code")`);
    await queryRunner.query(`CREATE INDEX "IDX_Products_Barcode" ON "Products" ("Barcode")`);
    await queryRunner.query(`CREATE INDEX "IDX_Customers_Phone" ON "Customers" ("Phone")`);
    await queryRunner.query(`CREATE INDEX "IDX_Vendors_Phone" ON "Vendors" ("Phone")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_InventoryTransactions_TransactionNumber" ON "InventoryTransactions" ("TransactionNumber")`);

    await queryRunner.query(`ALTER TABLE "InventoryTransactions" ADD CONSTRAINT "FK_InventoryTransactions_VendorId" FOREIGN KEY ("VendorId") REFERENCES "Vendors"("Id") ON DELETE SET NULL ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "InventoryTransactions" DROP CONSTRAINT "FK_InventoryTransactions_VendorId"`);
    await queryRunner.query(`DROP INDEX "IDX_InventoryTransactions_TransactionNumber" ON "InventoryTransactions"`);
    await queryRunner.query(`DROP INDEX "IDX_Vendors_Phone" ON "Vendors"`);
    await queryRunner.query(`DROP INDEX "IDX_Customers_Phone" ON "Customers"`);
    await queryRunner.query(`DROP INDEX "IDX_Products_Barcode" ON "Products"`);
    await queryRunner.query(`DROP INDEX "IDX_ProductCategories_Code" ON "ProductCategories"`);

    await queryRunner.query(`ALTER TABLE "InventoryTransactions" DROP COLUMN "Reason"`);
    await queryRunner.query(`ALTER TABLE "InventoryTransactions" DROP COLUMN "NewStock"`);
    await queryRunner.query(`ALTER TABLE "InventoryTransactions" DROP COLUMN "PreviousStock"`);
    await queryRunner.query(`ALTER TABLE "InventoryTransactions" DROP COLUMN "VendorId"`);
    await queryRunner.query(`ALTER TABLE "InventoryTransactions" DROP COLUMN "TransactionNumber"`);

    await queryRunner.query(`ALTER TABLE "Vendors" DROP COLUMN "Notes"`);
    await queryRunner.query(`ALTER TABLE "Vendors" DROP COLUMN "TIN"`);
    await queryRunner.query(`ALTER TABLE "Vendors" DROP COLUMN "ContactPerson"`);

    await queryRunner.query(`ALTER TABLE "Customers" DROP COLUMN "Notes"`);
    await queryRunner.query(`ALTER TABLE "Customers" DROP COLUMN "TIN"`);
    await queryRunner.query(`ALTER TABLE "Customers" DROP COLUMN "ContactPerson"`);

    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "LastStockMovementAt"`);
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "Description"`);
    await queryRunner.query(`ALTER TABLE "Products" DROP COLUMN "Barcode"`);

    await queryRunner.query(`ALTER TABLE "ProductCategories" DROP COLUMN "DeletedAt"`);
    await queryRunner.query(`ALTER TABLE "ProductCategories" DROP COLUMN "Code"`);
  }
}
