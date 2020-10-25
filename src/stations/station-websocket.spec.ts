import { StationWebSocket } from './station-websocket';
import { Station } from './station.entity';

jest.mock('ws');

describe('StationWebSocket', () => {
  let station: Station;

  beforeEach(() => {
    station = new Station();
    station.identity = 'test_station';
    station.centralSystemUrl = 'ws://localhost:1234';
  });

  describe('constructor', () => {
    it('set station and call createConnection, all binding methods are called', () => {
      const stationWebSocket = new StationWebSocket(station);

      expect(stationWebSocket.station).toEqual(station);

      const onFn = jest.spyOn(stationWebSocket.wsClient, 'on');

      expect(onFn).toHaveBeenCalledWith('message', stationWebSocket.onMessage);
      expect(onFn).toHaveBeenCalledWith(
        'open',
        stationWebSocket.onConnectionOpen,
      );
      expect(onFn).toHaveBeenCalledWith(
        'close',
        stationWebSocket.onConnectionClosed,
      );
      expect(onFn).toHaveBeenCalledWith('error', stationWebSocket.onError);
    });
  });

  describe('test bind method', () => {
    let stationWebSocket: StationWebSocket;
    beforeEach(() => {
      stationWebSocket = new StationWebSocket(station);
    });
    it('test onMessage function', async () => {
      const data = 'somedata';
      const logFn = jest.spyOn(console, 'log');

      stationWebSocket.onMessage(data);

      expect(logFn).toHaveBeenCalledWith('data received', data);
    });

    it('test onError function', () => {
      const logFn = jest.spyOn(console, 'log');

      const err = new Error('test');
      stationWebSocket.onError(err);

      expect(logFn).toHaveBeenCalledWith('Error', err);
    });

    it('test onOpen function', () => {
      jest.useFakeTimers();
      stationWebSocket.onConnectionOpen();

      const pingFn = jest.spyOn(stationWebSocket.wsClient, 'ping');
      expect(stationWebSocket.connectedTime).toBeInstanceOf(Date);
      expect(setInterval).toHaveBeenCalled();
      expect(stationWebSocket.pingInterval).not.toBeUndefined();

      jest.runTimersToTime(60000);

      expect(pingFn).toHaveBeenCalled();
    });

    it('test onClose function', () => {
      jest.useFakeTimers();
      stationWebSocket.connectedTime = new Date();
      stationWebSocket.pingInterval = setInterval(() => {}, 1000);
      stationWebSocket.onConnectionClosed(1005, 'needs to be closed');

      expect(clearInterval).toHaveBeenCalledWith(stationWebSocket.pingInterval);
      expect(stationWebSocket.wsClient).toBeNull();

      const createConnectionFn = jest.spyOn<any, any>(
        stationWebSocket,
        'createConnection',
      );
      const bindMethods = jest.spyOn<any, any>(stationWebSocket, 'bindMethods');
      jest.runTimersToTime(60000);

      expect(createConnectionFn).toHaveBeenCalledTimes(1);
      expect(bindMethods).toHaveBeenCalledTimes(1);
    });
  });
});
