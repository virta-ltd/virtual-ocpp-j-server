import { Test, TestingModule } from '@nestjs/testing';
import { ByChargePointOperationMessageGenerator } from '../../../message/by-charge-point/by-charge-point-operation-message-generator';
import { CallResultMessage } from '../../../models/CallResultMessage';
import { StationWebSocketClient } from '../../station-websocket-client';
import { Station } from '../../station.entity';
import { StationRepository } from '../../station.repository';
import { StartTransactionResultMsgHandler } from './start-transaction-result-msg-handler';
import * as utils from '../../utils';
import { flushPromises } from '../../../jest/helper';
jest.mock('ws');

const mockStationRepository = () => ({
  updateStation: jest.fn(),
});

const mockByChargePointOperationMessageGenerator = () => ({
  createMessage: jest.fn(),
});

describe('StartTransactionResultMsgHandler', () => {
  let station: Station;
  let startTransactionResultMsgHandler: StartTransactionResultMsgHandler;
  let stationRepository: StationRepository;
  let byChargePointOperationMessageGenerator: ByChargePointOperationMessageGenerator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartTransactionResultMsgHandler,
        {
          provide: StationRepository,
          useFactory: mockStationRepository,
        },
        {
          provide: ByChargePointOperationMessageGenerator,
          useFactory: mockByChargePointOperationMessageGenerator,
        },
      ],
    }).compile();

    startTransactionResultMsgHandler = module.get<StartTransactionResultMsgHandler>(StartTransactionResultMsgHandler);
    byChargePointOperationMessageGenerator = module.get<ByChargePointOperationMessageGenerator>(
      ByChargePointOperationMessageGenerator,
    );
    stationRepository = module.get<StationRepository>(StationRepository);
  });

  describe('handle', () => {
    let wsClient: StationWebSocketClient;
    beforeEach(() => {
      station = new Station();
      station.identity = 'test_station';
      station.chargeInProgress = false;
      station.currentTransactionId = null;
      station.centralSystemUrl = 'localhost';
      station.meterValue = 0;

      wsClient = new StationWebSocketClient(station.centralSystemUrl);
      wsClient.sendCallMsgForOperation = jest.fn();
    });

    it('test response is Rejected, nothing is called', () => {
      const transactionResponse = { idTagInfo: { status: 'Rejected' } };
      const parsedMessage: CallResultMessage = [3, 'abcdef', transactionResponse];

      startTransactionResultMsgHandler.handle(wsClient, station, parsedMessage);

      expect(stationRepository.updateStation).not.toHaveBeenCalled();
    });

    it('tests response is Accepted: update station chargeInProgress & currentTransactionId and createMeterValueInterval', async () => {
      station.reload = jest.fn().mockResolvedValue(station);
      station.save = jest.fn().mockResolvedValue(station);
      jest.spyOn(utils, 'calculatePowerUsageInWh').mockReturnValue(20);
      jest.useFakeTimers();
      const transactionId = 25;
      const transactionResponse = { transactionId, idTagInfo: { status: 'Accepted' } };
      const parsedMessage: CallResultMessage = [3, 'abcdef', transactionResponse];
      const expectedDto = { chargeInProgress: true, currentTransactionId: transactionId };
      const meterValuesMessage = `[2,\"11\",\"MeterValues\",{\"meterValue\":[{\"sampledValue\":[{\"value\":2774,\"context\":\"Sample.Periodic\",\"measurand\":\"Energy.Active.Import.Register\",\"unit\":\"Wh\",\"location\":\"Outlet\"}]}],\"connectorId\":1,\"transactionId\":355503}]`;
      jest.spyOn(byChargePointOperationMessageGenerator, 'createMessage').mockReturnValue(meterValuesMessage);

      startTransactionResultMsgHandler.handle(wsClient, station, parsedMessage);

      expect(stationRepository.updateStation).toHaveBeenCalledWith(station, expectedDto);
      expect(clearInterval).toHaveBeenCalled();
      expect(wsClient.meterValueInterval).not.toBeNull();

      jest.advanceTimersByTime(60000);
      await flushPromises();

      expect(station.meterValue).toEqual(20);
      expect(station.reload).toHaveBeenCalled();
      expect(station.save).toHaveBeenCalled();
      expect(wsClient.sendCallMsgForOperation).toHaveBeenCalledWith(meterValuesMessage, 'MeterValues');
    });
  });
});
