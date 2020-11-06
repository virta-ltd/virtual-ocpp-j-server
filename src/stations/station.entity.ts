import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, Timestamp } from 'typeorm';

@Entity()
export class Station extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  identity: string;

  @Column()
  vendor: string = process.env.DEFAULT_VENDOR;

  @Column()
  model: string = process.env.DEFAULT_MODEL;

  @Column()
  centralSystemUrl: string;

  @Column()
  meterValue: number = 0;

  @Column()
  chargeInProgress: boolean = false;

  @Column()
  currentTransactionId: number = null;

  @Column()
  currentChargingPower: number = 11000;

  @Column()
  createdAt: Date;

  @Column()
  updatedAt: Date;
}
