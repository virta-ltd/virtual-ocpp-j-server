import { Module } from '@nestjs/common';
import { AuthorizeRequestBuilder } from './by-charge-point/authorize-request-builder';
import { BootNotificationRequestBuilder } from './by-charge-point/boot-notification-request-builder';
import { ByChargePointOperationMessageGenerator } from './by-charge-point/by-charge-point-operation-message-generator';
import { ByChargePointRequestBuilderFactory } from './by-charge-point/by-charge-point-request-builder-factory';
import { HeartbeatRequestBuilder } from './by-charge-point/heartbeat-request-builder';
import { StartTransactionRequestBuilder } from './by-charge-point/start-transaction-request-builder';
import { StopTransactionRequestBuilder } from './by-charge-point/stop-transaction-request-builder';

@Module({
  imports: [],
  controllers: [],
  providers: [
    AuthorizeRequestBuilder,
    BootNotificationRequestBuilder,
    HeartbeatRequestBuilder,
    StartTransactionRequestBuilder,
    StopTransactionRequestBuilder,
    ByChargePointRequestBuilderFactory,
    ByChargePointOperationMessageGenerator,
  ],
  exports: [ByChargePointOperationMessageGenerator],
})
export class MessageModule {}
