import { Module } from '@nestjs/common';
import { BootNotificationRequestBuilder } from './by-charge-point/boot-notification-request-builder';
import { ByChargePointOperationMessageFactory } from './by-charge-point/by-charge-point-operation-message-factory';
import { HeartbeatRequestBuilder } from './by-charge-point/heartbeat-request-builder';

@Module({
  imports: [],
  controllers: [],
  providers: [BootNotificationRequestBuilder, HeartbeatRequestBuilder, ByChargePointOperationMessageFactory],
  exports: [ByChargePointOperationMessageFactory],
})
export class MessageModule {}
