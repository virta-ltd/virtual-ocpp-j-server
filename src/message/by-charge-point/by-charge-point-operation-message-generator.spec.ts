import { Test } from '@nestjs/testing';
import { ChargePointMessageTypes } from '../../models/ChargePointMessageTypes';
import { Station } from '../../stations/station.entity';
import { ByChargePointOperationMessageGenerator } from './by-charge-point-operation-message-generator';
import { ByChargePointRequestBuilderFactory } from './by-charge-point-request-builder-factory';

describe('ByChargePointOperationMessageGenerator', () => {
  describe('createMessage', () => {
    let station: Station;
    let byChargePointOperationMessageGenerator: ByChargePointOperationMessageGenerator;
    let mockByChargePointRequestBuilderFactory: ByChargePointRequestBuilderFactory;

    const getMockedByChargePointRequestBuilderFactory = () => ({
      getBuilderFromOperationName: jest.fn(),
    });

    beforeEach(async () => {
      station = new Station();
      station.identity = 'test_identity';
      station.vendor = 'vendor';
      station.model = 'model';

      const testModule = await Test.createTestingModule({
        providers: [
          {
            provide: ByChargePointRequestBuilderFactory,
            useFactory: getMockedByChargePointRequestBuilderFactory,
          },
          ByChargePointOperationMessageGenerator,
        ],
      }).compile();

      byChargePointOperationMessageGenerator = testModule.get<ByChargePointOperationMessageGenerator>(
        ByChargePointOperationMessageGenerator,
      );
      mockByChargePointRequestBuilderFactory = testModule.get<ByChargePointRequestBuilderFactory>(
        ByChargePointRequestBuilderFactory,
      );
    });
    it('gets empty string when builder is null', () => {
      jest.spyOn(mockByChargePointRequestBuilderFactory, 'getBuilderFromOperationName').mockReturnValue(null);
      const message = byChargePointOperationMessageGenerator.createMessage('abc', station, 1);
      expect(message).toStrictEqual('');
    });

    it('calls build message from builder and form ready-made message to be sent', () => {
      const uniqueId = 1;
      const payload = { vendor: 'abc', model: 'def' };
      const chargePointRequest = { chargePointVendor: 'abc', chargePointModel: 'def' };
      const operationName = 'BootNotification';
      jest.spyOn(mockByChargePointRequestBuilderFactory, 'getBuilderFromOperationName').mockReturnValue({
        build: () => chargePointRequest,
        getOperationName: () => operationName,
      });

      const message = byChargePointOperationMessageGenerator.createMessage(
        'bootnotification',
        station,
        uniqueId,
        payload,
      );

      expect(message).toEqual(
        JSON.stringify([ChargePointMessageTypes.Call, uniqueId.toString(), operationName, chargePointRequest]),
      );
    });
  });
});
