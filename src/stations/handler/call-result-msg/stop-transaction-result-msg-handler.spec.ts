import { Test, TestingModule } from '@nestjs/testing';
import { ByChargePointOperationMessageGenerator } from '../../../message/by-charge-point/by-charge-point-operation-message-generator';
import { CallResultMessage } from '../../../models/CallResultMessage';
import { CreateOrUpdateStationDto } from '../../dto/create-update-station.dto';
import { StationWebSocketClient } from '../../station-websocket-client';
import { Station } from '../../station.entity';
import { StationRepository } from '../../station.repository';
import { StopTransactionResultMsgHandler } from './stop-transaction-result-msg-handler';
jest.mock('ws');

const mockStationRepository = () => ({
  updateStation: jest.fn(),
});

const mockByChargePointOperationMessageGenerator = () => ({
  createMessage: jest.fn(),
});

describe('StopTransactionResultMsgHandler', () => {
  let station: Station;
  let stopTransactionResultMsgHandler: StopTransactionResultMsgHandler;
  let stationRepository: StationRepository;
  let byChargePointOperationMessageGenerator: ByChargePointOperationMessageGenerator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StopTransactionResultMsgHandler,
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

    stopTransactionResultMsgHandler = module.get<StopTransactionResultMsgHandler>(StopTransactionResultMsgHandler);
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
    it('tests response is Rejected, nothing is called', () => {
      const transactionResponse = { idTagInfo: { status: 'Rejected' } };
      const parsedMessage: CallResultMessage = [3, 'abcdef', transactionResponse];

      stopTransactionResultMsgHandler.handle(wsClient, station, parsedMessage);

      expect(stationRepository.updateStation).not.toHaveBeenCalled();
    });

    it(`test response case Accepted`, () => {
      const transactionResponse = { idTagInfo: { status: 'Accepted' } };
      const parsedMessage: CallResultMessage = [3, 'abcdef', transactionResponse];
      jest.useFakeTimers();
      const expectedDto: CreateOrUpdateStationDto = {
        chargeInProgress: false,
        currentTransactionId: null,
      };
      const messageIdForCall = 25;
      wsClient.getMessageIdForCall = () => messageIdForCall;
      wsClient.sendCallMsgForOperation = jest.fn();
      const statusNotificationMessage = `[2,\"18\",\"StatusNotification\",{\"connectorId\":1,\"errorCode\":\"NoError\",\"status\":\"Available\",\"timestamp\":\"2021-02-01T13:34:59.504Z\"}]`;
      byChargePointOperationMessageGenerator.createMessage = jest.fn().mockReturnValue(statusNotificationMessage);

      stopTransactionResultMsgHandler.handle(wsClient, station, parsedMessage);

      expect(clearInterval).toHaveBeenCalledTimes(1);

      expect(stationRepository.updateStation).toHaveBeenCalledWith(station, expectedDto);

      expect(byChargePointOperationMessageGenerator.createMessage).toHaveBeenCalledWith(
        'StatusNotification',
        station,
        messageIdForCall,
        {},
      );

      jest.advanceTimersByTime(1000);

      expect(wsClient.sendCallMsgForOperation).toHaveBeenCalledWith(statusNotificationMessage, 'StatusNotification');
    });
  });
});
