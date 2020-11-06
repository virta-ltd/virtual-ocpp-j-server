import { Injectable } from '@nestjs/common';
import { AuthorizeRequestBuilder } from './authorize-request-builder';
import { BootNotificationRequestBuilder } from './boot-notification-request-builder';
import { ByChargePointRequestBuilderInterface } from './by-charge-point-request-builder-interface';
import { HeartbeatRequestBuilder } from './heartbeat-request-builder';
import { MeterValuesRequestBuilder } from './meter-values-request-builder';
import { StartTransactionRequestBuilder } from './start-transaction-request-builder';
import { StatusNotificationRequestBuilder } from './status-notification-request-builder';
import { StopTransactionRequestBuilder } from './stop-transaction-request-builder';

@Injectable()
export class ByChargePointRequestBuilderFactory {
  constructor(
    private readonly authorizeRequestBuilder: AuthorizeRequestBuilder,
    private readonly bootNotificationRequestBuilder: BootNotificationRequestBuilder,
    private readonly heartbeatRequestBuidler: HeartbeatRequestBuilder,
    private readonly meterValuesRequestBuilder: MeterValuesRequestBuilder,
    private readonly startTransactionRequestBuilder: StartTransactionRequestBuilder,
    private readonly statusNotificationRequestBuilder: StatusNotificationRequestBuilder,
    private readonly stopTransactionRequestBuilder: StopTransactionRequestBuilder,
  ) {}

  getBuilderFromOperationName(operationName: string): ByChargePointRequestBuilderInterface | null {
    switch (operationName.toLowerCase()) {
      case 'authorize':
        return this.authorizeRequestBuilder;
      case 'bootnotification':
        return this.bootNotificationRequestBuilder;
      case 'heartbeat':
        return this.heartbeatRequestBuidler;
      case 'metervalues':
        return this.meterValuesRequestBuilder;
      case 'starttransaction':
        return this.startTransactionRequestBuilder;
      case 'statusnotification':
        return this.statusNotificationRequestBuilder;
      case 'stoptransaction':
        return this.stopTransactionRequestBuilder;
      default:
        return null;
    }
  }
}
