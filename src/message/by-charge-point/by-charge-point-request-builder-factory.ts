import { Injectable } from '@nestjs/common';
import { BootNotificationRequestBuilder } from './boot-notification-request-builder';
import { ByChargePointRequestBuilderInterface } from './by-charge-point-request-builder-interface';
import { HeartbeatRequestBuilder } from './heartbeat-request-builder';

@Injectable()
export class ByChargePointRequestBuilderFactory {
  constructor(
    private readonly bootNotificationRequestBuilder: BootNotificationRequestBuilder,
    private readonly heartbeatRequestBuidler: HeartbeatRequestBuilder,
  ) {}

  getBuilderFromOperationName(operationName: string): ByChargePointRequestBuilderInterface | null {
    switch (operationName.toLowerCase()) {
      case 'bootnotification':
        return this.bootNotificationRequestBuilder;
      case 'heartbeat':
        return this.heartbeatRequestBuidler;
      default:
        return null;
    }
  }
}
