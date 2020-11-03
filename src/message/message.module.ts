import { Module } from '@nestjs/common';
import { AuthorizeRequestBuilder } from './by-charge-point/authorize-request-builder';
import { BootNotificationRequestBuilder } from './by-charge-point/boot-notification-request-builder';
import { ByChargePointOperationMessageGenerator } from './by-charge-point/by-charge-point-operation-message-generator';
import { ByChargePointRequestBuilderFactory } from './by-charge-point/by-charge-point-request-builder-factory';
import { HeartbeatRequestBuilder } from './by-charge-point/heartbeat-request-builder';

@Module({
  imports: [],
  controllers: [],
  providers: [
    AuthorizeRequestBuilder,
    BootNotificationRequestBuilder,
    HeartbeatRequestBuilder,
    ByChargePointRequestBuilderFactory,
    ByChargePointOperationMessageGenerator,
  ],
  exports: [ByChargePointOperationMessageGenerator],
})
export class MessageModule {}
