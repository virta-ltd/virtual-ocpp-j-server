import { Test, TestingModule } from '@nestjs/testing';
import { ByChargePointOperationMessageGenerator } from '../../../message/by-charge-point/by-charge-point-operation-message-generator';
import { StationWebSocketClient } from '../../station-websocket-client';
import { Station } from '../../station.entity';
import { RemoteStartTransactionMsgHandler } from './remote-start-transaction-msg-handler';
jest.mock('ws');

describe('RemoteStartTransactionMsgHandler', () => {
  let station: Station;
  let remoteStartTransactionMsgHandler: RemoteStartTransactionMsgHandler;
  let byChargePointOperationMessageGeneratorFactory = () => ({
    createMessage: jest.fn(),
  });
  let byChargePointOperationMessageGenerator: ByChargePointOperationMessageGenerator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ByChargePointOperationMessageGenerator,
          useFactory: byChargePointOperationMessageGeneratorFactory,
        },
        RemoteStartTransactionMsgHandler,
      ],
    }).compile();
    remoteStartTransactionMsgHandler = module.get<RemoteStartTransactionMsgHandler>(RemoteStartTransactionMsgHandler);
    byChargePointOperationMessageGenerator = module.get<ByChargePointOperationMessageGenerator>(
      ByChargePointOperationMessageGenerator,
    );
  });

  describe('handle', () => {
    beforeEach(() => {
      station = new Station();
      station.identity = 'test_station';
      station.centralSystemUrl = 'ws://localhost:1234';
    });

    it('builds Accepted response & send StartTransaction', () => {
      const messageIdForCall = 10;
      const idTag = 'CUID40041';
      const wsClient = new StationWebSocketClient(station.centralSystemUrl);
      wsClient.sendCallMsgForOperation = jest.fn();
      wsClient.getMessageIdForCall = () => messageIdForCall;

      const startTransactionMsg = `[2,\"22\",\"StartTransaction\",{\"connectorId\":1,\"idTag\":\"CUID40041\",\"meterStart\":195575,\"timestamp\":\"2021-01-27T10:49:52.077Z\"}]`;
      (byChargePointOperationMessageGenerator.createMessage as jest.Mock).mockReturnValue(startTransactionMsg);

      remoteStartTransactionMsgHandler.handle(
        wsClient,
        station,
        `[2,\"6192a343-45e9-44bd-82d7-7a54f7955bfd\",\"RemoteStartTransaction\",{\"idTag\":\"${idTag}\",\"connectorId\":1}]`,
      );

      expect(wsClient.send).toHaveBeenNthCalledWith(
        1,
        '[3,"6192a343-45e9-44bd-82d7-7a54f7955bfd",{"status":"Accepted"}]',
      );

      expect(byChargePointOperationMessageGenerator.createMessage).toHaveBeenCalledWith(
        'StartTransaction',
        station,
        messageIdForCall,
        { idTag },
      );

      expect(wsClient.sendCallMsgForOperation).toHaveBeenCalledWith(startTransactionMsg, 'StartTransaction');
    });
  });
});
