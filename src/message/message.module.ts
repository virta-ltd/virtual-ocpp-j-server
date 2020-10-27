import { Module } from '@nestjs/common';
import { BootNotificationRequestBuilder } from './by-charge-point/boot-notification-request-builder';
import { ByChargePointOperationMessageFactory } from './by-charge-point/by-charge-point-operation-message-factory';

@Module({
  imports: [],
  controllers: [],
  providers: [BootNotificationRequestBuilder, ByChargePointOperationMessageFactory],
  exports: [ByChargePointOperationMessageFactory],
})
export class MessageModule {}
