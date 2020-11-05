import { Module } from '@nestjs/common';
import { AuthorizeRequestBuilder } from './by-charge-point/authorize-request-builder';
import { BootNotificationRequestBuilder } from './by-charge-point/boot-notification-request-builder';
import { ByChargePointOperationMessageGenerator } from './by-charge-point/by-charge-point-operation-message-generator';
import { ByChargePointRequestBuilderFactory } from './by-charge-point/by-charge-point-request-builder-factory';
import { HeartbeatRequestBuilder } from './by-charge-point/heartbeat-request-builder';
import { MeterValuesRequestBuilder } from './by-charge-point/meter-values-request-builder';
import { StartTransactionRequestBuilder } from './by-charge-point/start-transaction-request-builder';
import { StatusNotificationRequestBuilder } from './by-charge-point/status-notification-request-builder';
import { StopTransactionRequestBuilder } from './by-charge-point/stop-transaction-request-builder';

@Module({
  imports: [],
  controllers: [],
  providers: [
    AuthorizeRequestBuilder,
    BootNotificationRequestBuilder,
    HeartbeatRequestBuilder,
    MeterValuesRequestBuilder,
    StartTransactionRequestBuilder,
    StatusNotificationRequestBuilder,
    StopTransactionRequestBuilder,
    ByChargePointRequestBuilderFactory,
    ByChargePointOperationMessageGenerator,
  ],
  exports: [ByChargePointOperationMessageGenerator],
})
export class MessageModule {}
