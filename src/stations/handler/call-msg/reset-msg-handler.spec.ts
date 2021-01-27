import { Test, TestingModule } from '@nestjs/testing';
import { StationWebSocketClient } from '../../station-websocket-client';
import { Station } from '../../station.entity';
import { ResetMsgHandler } from './reset-msg-handler';
jest.mock('ws');

describe('ResetMsgHandler', () => {
  let station: Station;
  let resetMsgHandler: ResetMsgHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResetMsgHandler],
    }).compile();
    resetMsgHandler = module.get<ResetMsgHandler>(ResetMsgHandler);
  });
  describe('handle', () => {
    beforeEach(() => {
      station = new Station();
      station.identity = 'test_station';
      station.centralSystemUrl = 'ws://localhost:1234';
      station.currentTransactionId = 1234;
      station.chargeInProgress = true;
    });

    it('builds & sends Accepted response, reset value of inProgress and currentTransactionId, then close connection', async () => {
      const wsClient = new StationWebSocketClient(station.centralSystemUrl);
      wsClient.close = jest.fn();
      station.save = jest.fn();

      await resetMsgHandler.handle(
        wsClient,
        station,
        `[2,\"70fd59b1-fa19-4173-a6ba-dee9ba92988d\",\"Reset\",{\"type\":\"Hard\"}]`,
      );

      expect(wsClient.send).toHaveBeenCalledWith('[3,"70fd59b1-fa19-4173-a6ba-dee9ba92988d",{"status":"Accepted"}]');

      expect(station.save).toHaveBeenCalledTimes(1);
      expect(station.chargeInProgress).toBeFalsy();
      expect(station.currentTransactionId).toBeNull();

      expect(wsClient.close).toHaveBeenCalledWith(1012, 'Reset requested by Central System');
    });
  });
});
