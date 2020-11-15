import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class StationTable1602856827676 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'station',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'identity',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'vendor',
            type: 'varchar(20)',
            isNullable: false,
            default: `'${process.env.DEFAULT_VENDOR}'`,
          },
          {
            name: 'model',
            type: 'varchar(20)',
            isNullable: false,
            default: `'${process.env.DEFAULT_MODEL}'`,
          },
          {
            name: 'centralSystemUrl',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'meterValue',
            type: 'int',
            unsigned: true,
            isNullable: false,
            default: 0,
          },
          {
            name: 'chargeInProgress',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'currentTransactionId',
            type: 'int',
            unsigned: true,
            isNullable: true,
          },
          {
            name: 'currentChargingPower',
            type: 'int',
            unsigned: true,
            isNullable: false,
            default: 11000,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query('DROP TABLE station;');
  }
}
