import { Station } from 'src/stations/station.entity';
import { Injectable, Logger } from '@nestjs/common';
import { ChargePointMessageTypes } from '../../models/ChargePointMessageTypes';
import { ByChargePointRequestBuilderFactory } from './by-charge-point-request-builder-factory';

@Injectable()
export class ByChargePointOperationMessageGenerator {
  constructor(private readonly byChargePointRequestBuilderFactory: ByChargePointRequestBuilderFactory) {}

  public createMessage(operationName: string, station: Station, uniqueId: number, payload?: any): string {
    const builder = this.byChargePointRequestBuilderFactory.getBuilderFromOperationName(operationName);

    if (builder === null) {
      return '';
    }

    const chargePointRequest = builder.build(station, payload ?? {});

    const message = JSON.stringify([
      ChargePointMessageTypes.Call,
      uniqueId.toString(),
      builder.getOperationName(),
      chargePointRequest,
    ]);

    return message;
  }
}
