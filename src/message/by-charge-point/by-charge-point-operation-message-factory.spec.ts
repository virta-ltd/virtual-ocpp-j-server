import { Test } from '@nestjs/testing';
import { Station } from '../../stations/station.entity';
import { BootNotificationRequestBuilder } from './boot-notification-request-builder';
import { ByChargePointOperationMessageFactory } from './by-charge-point-operation-message-factory';
import { HeartbeatRequestBuilder } from './heartbeat-request-builder';

describe('ByChargePointOperationMessageFactory', () => {
  describe('createMessage', () => {
    let station: Station;
    let byChargePointOperationMessageFactory: ByChargePointOperationMessageFactory;

    beforeEach(async () => {
      station = new Station();
      station.identity = 'test_identity';
      station.vendor = 'vendor';
      station.model = 'model';

      const testModule = await Test.createTestingModule({
        providers: [HeartbeatRequestBuilder, BootNotificationRequestBuilder, ByChargePointOperationMessageFactory],
      }).compile();

      byChargePointOperationMessageFactory = testModule.get<ByChargePointOperationMessageFactory>(
        ByChargePointOperationMessageFactory,
      );
    });
    it('gets empty string when operationName is not one of the OCPP messages', () => {
      const message = byChargePointOperationMessageFactory.createMessage('abc', station, 1);
      expect(message).toStrictEqual('');
    });
  });
});
