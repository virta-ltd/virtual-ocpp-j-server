import { ByChargePointRequestTypes } from 'src/models/ByChargePointRequestTypes';
import { Station } from 'src/stations/station.entity';

export interface ByChargePointRequestBuilderInterface {
  build(station?: Station, payload?: any): ByChargePointRequestTypes;

  getOperationName(): string;
}
