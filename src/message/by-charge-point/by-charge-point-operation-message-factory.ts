import { Station } from 'src/stations/station.entity';
import { Injectable, Logger } from '@nestjs/common';
import { BootNotificationRequestBuilder } from './boot-notification-request-builder';
import { ByChargePointRequestBuilderInterface } from './by-charge-point-request-builder-interface';
import { ChargePointMessageTypes } from '../../models/ChargePointMessageTypes';
import { HeartbeatRequestBuilder } from './heartbeat-request-builder';

@Injectable()
export class ByChargePointOperationMessageFactory {
  private logger = new Logger('ByChargePointOperationMessageFactory');
  constructor(
    private readonly bootNotificationRequestBuilder: BootNotificationRequestBuilder,
    private readonly heartbeatRequestBuidler: HeartbeatRequestBuilder,
  ) {}

  private getRequestBuilder(operationName: string): ByChargePointRequestBuilderInterface {
    switch (operationName.toLowerCase()) {
      case 'bootnotification':
        return this.bootNotificationRequestBuilder;
      case 'heartbeat':
        return this.heartbeatRequestBuidler;
      default:
        return null;
    }
  }

  public createMessage(operationName: string, station: Station, uniqueId: number, payload?: any): string {
    const builder = this.getRequestBuilder(operationName);

    if (builder === null) {
      return '';
    }

    const chargePointRequest = builder.build(station, payload);

    const message = JSON.stringify([
      ChargePointMessageTypes.Call,
      uniqueId.toString(),
      builder.getOperationName(),
      chargePointRequest,
    ]);

    this.logger.debug(`Created Message: ${message}`);

    return message;
  }
}
