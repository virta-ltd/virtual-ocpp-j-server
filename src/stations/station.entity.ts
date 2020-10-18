import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Station extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  identity: string;

  @Column()
  vendor: string;

  @Column()
  model: string;

  @Column()
  centralSystemUrl: string;

  @Column()
  meterValue: number;

  @Column()
  chargeInProgress: boolean = false;

  @Column()
  currentTransactionId: number = 0;

  @Column()
  currentChargingPower: number;
}
