import { Test, TestingModule } from '@nestjs/testing';
import { ByChargePointOperationMessageGenerator } from '../../../message/by-charge-point/by-charge-point-operation-message-generator';
import { StationWebSocketClient } from '../../station-websocket-client';
import { Station } from '../../station.entity';
import { StationRepository } from '../../station.repository';
import { RemoteStopTransactionMsgHandler } from './remote-stop-transaction-msg-handler';
import * as utils from '../../utils';
import { CreateOrUpdateStationDto } from '../../dto/create-update-station.dto';
jest.mock('ws');

const mockStationRepository = () => ({
  updateStation: jest.fn(),
});

describe('RemoteStopTransactionMsgHandler', () => {
  let station: Station;
  let stationRepository: StationRepository;
  let remoteStopTransactionMsgHandler: RemoteStopTransactionMsgHandler;
  let byChargePointOperationMessageGeneratorFactory = () => ({
    createMessage: jest.fn(),
  });
  let byChargePointOperationMessageGenerator: ByChargePointOperationMessageGenerator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: StationRepository,
          useFactory: mockStationRepository,
        },
        {
          provide: ByChargePointOperationMessageGenerator,
          useFactory: byChargePointOperationMessageGeneratorFactory,
        },
        RemoteStopTransactionMsgHandler,
      ],
    }).compile();
    remoteStopTransactionMsgHandler = module.get<RemoteStopTransactionMsgHandler>(RemoteStopTransactionMsgHandler);
    byChargePointOperationMessageGenerator = module.get<ByChargePointOperationMessageGenerator>(
      ByChargePointOperationMessageGenerator,
    );
    stationRepository = module.get<StationRepository>(StationRepository);
  });

  describe('handle', () => {
    beforeEach(() => {
      station = new Station();
      station.meterValue = 0;
      station.identity = 'test_station';
      station.centralSystemUrl = 'ws://localhost:1234';
      station.currentTransactionId = 1234;
    });

    it('reloads station, build response case Accepted, send response & send StopTransaction msg', async () => {
      station.reload = jest.fn().mockResolvedValueOnce(station);
      const newMeterValue = 20;
      jest.spyOn(utils, 'calculatePowerUsageInWh').mockReturnValue(newMeterValue);
      const expectedDto: CreateOrUpdateStationDto = {
        meterValue: newMeterValue,
      };

      const messageIdForCall = 10;
      const wsClient = new StationWebSocketClient(station.centralSystemUrl);
      wsClient.sendCallMsgForOperation = jest.fn();
      wsClient.getMessageIdForCall = () => messageIdForCall;

      const stopTransactionMsg =
        '[2,"2","StopTransaction",{"transactionId":354348,"meterStop":195575,"timestamp":"2021-01-26T12:39:18.753Z"}]';
      (byChargePointOperationMessageGenerator.createMessage as jest.Mock).mockReturnValue(stopTransactionMsg);

      await remoteStopTransactionMsgHandler.handle(
        wsClient,
        station,
        `[2,"c1f62f7f-bfab-44b4-b42c-28ca200606aa","RemoteStopTransaction",{"transactionId":${station.currentTransactionId}}]`,
      );

      expect(wsClient.send).toHaveBeenNthCalledWith(
        1,
        '[3,"c1f62f7f-bfab-44b4-b42c-28ca200606aa",{"status":"Accepted"}]',
      );
      expect(stationRepository.updateStation).toHaveBeenCalledWith(station, expectedDto);

      expect(byChargePointOperationMessageGenerator.createMessage).toHaveBeenCalledWith(
        'StopTransaction',
        station,
        messageIdForCall,
      );
      expect(wsClient.sendCallMsgForOperation).toHaveBeenCalledWith(stopTransactionMsg, 'StopTransaction');
    });

    it('build response case Rejected, send rejected response & not send StopTransaction msg', async () => {
      station.reload = jest.fn();
      const wrongTransactionId = 11;

      const wsClient = new StationWebSocketClient(station.centralSystemUrl);
      wsClient.sendCallMsgForOperation = jest.fn();

      await remoteStopTransactionMsgHandler.handle(
        wsClient,
        station,
        `[2,"c1f62f7f-bfab-44b4-b42c-28ca200606aa","RemoteStopTransaction",{"transactionId":${wrongTransactionId}}]`,
      );

      expect(wsClient.send).toHaveBeenNthCalledWith(
        1,
        '[3,"c1f62f7f-bfab-44b4-b42c-28ca200606aa",{"status":"Rejected"}]',
      );

      expect(byChargePointOperationMessageGenerator.createMessage).not.toHaveBeenCalled();
    });
  });
});
