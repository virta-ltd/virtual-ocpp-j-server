import { IsInt, IsOptional, IsString } from 'class-validator';

export class StationOperationDto {
  // for StartTransaction & Authorize
  @IsString()
  idTag?: string;

  // for StopTransaction
  @IsInt()
  transactionId?: number;
}
