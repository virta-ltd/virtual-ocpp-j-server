import { IsOptional, IsString } from 'class-validator';

export class GetStationsFilterDto {
  @IsString()
  @IsOptional()
  identity?: string;
}
