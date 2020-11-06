import { IsBoolean, IsInt, IsString } from 'class-validator';

export class CreateOrUpdateStationDto {
  @IsString()
  identity?: string;

  @IsString()
  centralSystemUrl?: string;

  @IsInt()
  meterValue?: number;

  @IsInt()
  currentChargingPower?: number;

  @IsBoolean()
  chargeInProgress?: boolean;

  @IsInt()
  currentTransactionId?: number;
}
