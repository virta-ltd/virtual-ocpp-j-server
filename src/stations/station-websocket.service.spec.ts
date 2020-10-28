import { Test, TestingModule } from '@nestjs/testing';
import { MessageModule } from '../message/message.module';
import { StationWebSocketService } from './station-websocket.service';
import { Station } from './station.entity';
import { StationWebSocketClient } from './station-websocket-client';
jest.mock('ws');

describe('StationWebSocketService', () => {
  let station: Station;
  let stationWebSocketService: StationWebSocketService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [MessageModule],
      providers: [StationWebSocketService],
    }).compile();
    stationWebSocketService = module.get<StationWebSocketService>(StationWebSocketService);

    station = new Station();
    station.identity = 'test_station';
    station.centralSystemUrl = 'ws://localhost:1234';
  });

  describe('createStationWebSocket', () => {
    it('createNewStationSocket is called and bindings are created', () => {
      const stationWsClient = stationWebSocketService.createStationWebSocket(station);

      const onFn = jest.spyOn(stationWsClient, 'on');

      expect(onFn).toHaveBeenCalledWith('open', expect.any(Function));
      expect(onFn).toHaveBeenCalledWith('message', expect.any(Function));
      expect(onFn).toHaveBeenCalledWith('close', expect.any(Function));
      expect(onFn).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('test bind method', () => {
    let stationWebSocketClient: StationWebSocketClient;
    beforeEach(() => {
      stationWebSocketClient = stationWebSocketService.createStationWebSocket(station);
    });
    it('test onMessage function', async () => {
      const data = 'somedata';
      // to be tested later
      // expect(stationWebSocketService.onMessage(stationWebSocketClient, station, data)).toThrowError();
    });

    it('test onError function', () => {
      // to be tested later
      // const logFn = jest.spyOn(console, 'log');
      // const err = new Error('test');
      // stationWebSocketClient.onError(err);
      // expect(logFn).toHaveBeenCalledWith('Error', err);
    });

    it('test onOpen function', () => {
      jest.useFakeTimers();
      stationWebSocketService.onConnectionOpen(stationWebSocketClient, station);
      expect(stationWebSocketClient.stationIdentity).toEqual(station.identity);
      expect(stationWebSocketClient.connectedTime).toBeInstanceOf(Date);
      expect(setInterval).toHaveBeenCalled();
      expect(stationWebSocketClient.heartbeatInterval).not.toBeUndefined();
      const sendFn = jest.spyOn(stationWebSocketClient, 'send');
      expect(sendFn).toHaveBeenNthCalledWith(1, expect.stringContaining('BootNotification'));

      jest.runTimersToTime(60000);

      expect(sendFn).toHaveBeenLastCalledWith(expect.stringContaining('Heartbeat'));
    });

    it('test onClose function', () => {
      jest.useFakeTimers();
      stationWebSocketClient.connectedTime = new Date();
      stationWebSocketClient.heartbeatInterval = setInterval(() => {}, 1000);
      stationWebSocketService.onConnectionClosed(stationWebSocketClient, station, 1005, 'needs to be closed');

      expect(clearInterval).toHaveBeenCalledWith(stationWebSocketClient.heartbeatInterval);
    });
  });
});
