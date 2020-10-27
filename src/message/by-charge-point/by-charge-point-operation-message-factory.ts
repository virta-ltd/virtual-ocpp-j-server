import { Station } from 'src/stations/station.entity';
import { Injectable, Logger } from '@nestjs/common';
import { BootNotificationRequestBuilder } from './boot-notification-request-builder';
import { ByChargePointRequestBuilderInterface } from './by-charge-point-request-builder-interface';
import { ChargePointMessageTypes } from '../../models/ChargePointMessageTypes';

@Injectable()
export class ByChargePointOperationMessageFactory {
  private logger = new Logger('ByChargePointOperationMessageFactory');
  constructor(private readonly bootNotificationRequestBuilder: BootNotificationRequestBuilder) {}

  public getRequestBuilder(operationName: string): ByChargePointRequestBuilderInterface {
    switch (operationName.toLowerCase()) {
      case 'bootnotification':
        return this.bootNotificationRequestBuilder;
    }
  }

  public createMessage(operationName: string, station: Station, uniqueId: number, payload?: any): string {
    const builder = this.getRequestBuilder(operationName);
    const chargePointRequest = builder.build(station, payload);

    const message = JSON.stringify([ChargePointMessageTypes.Call, uniqueId, operationName, chargePointRequest]);

    this.logger.debug(`Created Message: ${message}`);

    return message;
  }
}
