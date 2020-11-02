import { Test, TestingModule } from '@nestjs/testing';
import { StationWebSocketService } from './station-websocket.service';
import { Station } from './station.entity';
import { StationWebSocketClient } from './station-websocket-client';
import { BadRequestException } from '@nestjs/common';
import { ByChargePointOperationMessageFactory } from '../message/by-charge-point/by-charge-point-operation-message-factory';
jest.mock('ws');

describe('StationWebSocketService', () => {
  let station: Station;
  let stationWebSocketService: StationWebSocketService;
  let mockByChargePointOperationMessageFactory = {
    createMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ByChargePointOperationMessageFactory,
          useValue: mockByChargePointOperationMessageFactory,
        },
        StationWebSocketService,
      ],
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

    describe('onMessage function', () => {
      afterEach(() => {
        jest.clearAllTimers();
      });
      it('test onMessage for CallResult but lastMessageId do not match', () => {
        stationWebSocketClient.lastMessageId = 1;

        const data = `[3,\"4\",{\"status\":\"Accepted\",\"currentTime\":\"2020-11-01T18:00:11.585620Z\",\"interval\":60}]`;

        stationWebSocketService.onMessage(stationWebSocketClient, station, data);

        expect(stationWebSocketClient.expectingCallResult).toBeFalsy();
        expect(stationWebSocketClient.callResultMessageFromCS).toBeNull();
      });

      it('test onMessage for but does not expect callResult', () => {
        stationWebSocketClient.lastMessageId = 4;

        const data = `[3,\"4\",{\"currentTime\":\"2020-11-01T18:08:19.170Z\"}]`;

        stationWebSocketService.onMessage(stationWebSocketClient, station, data);

        expect(stationWebSocketClient.expectingCallResult).toBeFalsy();
        expect(stationWebSocketClient.callResultMessageFromCS).toBeNull();
      });

      it('test onMessage when expecting callResult', () => {
        stationWebSocketClient.lastMessageId = 4;
        stationWebSocketClient.expectingCallResult = true;

        const data = `[3,\"4\",{\"currentTime\":\"2020-11-01T18:08:19.170Z\"}]`;

        stationWebSocketService.onMessage(stationWebSocketClient, station, data);

        expect(stationWebSocketClient.expectingCallResult).toBeTruthy();
        expect(stationWebSocketClient.callResultMessageFromCS).toEqual(data);
      });
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
      mockByChargePointOperationMessageFactory.createMessage.mockReturnValue(
        `[2,\"10\",\"BootNotification\",{\"chargePointVendor\":\"Virtual\",\"chargePointModel\":\"OCPP-J 1.6\"}]`,
      );
      stationWebSocketService.onConnectionOpen(stationWebSocketClient, station);
      expect(stationWebSocketClient.stationIdentity).toEqual(station.identity);
      expect(stationWebSocketClient.connectedTime).toBeInstanceOf(Date);
      expect(setInterval).toHaveBeenCalled();
      expect(stationWebSocketClient.heartbeatInterval).not.toBeUndefined();
      expect(mockByChargePointOperationMessageFactory.createMessage).toHaveBeenCalledWith(
        'BootNotification',
        station,
        stationWebSocketClient.getLastMessageId(),
      );

      const sendFn = jest.spyOn(stationWebSocketClient, 'send');
      expect(sendFn).toHaveBeenNthCalledWith(1, expect.stringContaining('BootNotification'));

      mockByChargePointOperationMessageFactory.createMessage.mockReturnValue(`[2,\"16\",\"Heartbeat\",{}]`);
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

  describe('sendMessageToCentralSystem', () => {
    let stationWebSocketClient: StationWebSocketClient;

    beforeEach(() => {
      stationWebSocketClient = stationWebSocketService.createStationWebSocket(station);
    });
    it('throws exception if operationName is not correct', async () => {
      const operationName = 'abc';
      expect(
        stationWebSocketService.sendMessageToCentralSystem(stationWebSocketClient, station, operationName, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('sends message to CentralSystem based on params', async () => {
      const operationName = 'Heartbeat';

      const callMessage = `[2,"4","Heartbeat",{}]`;
      const callResultMessage = '[3,"4",{"currentTime":"2020-11-01T18:08:19.170Z"}]';

      mockByChargePointOperationMessageFactory.createMessage.mockReturnValue(callMessage);
      jest.spyOn(stationWebSocketService, 'waitForMessage').mockResolvedValue(callResultMessage);

      const { request, response } = await stationWebSocketService.sendMessageToCentralSystem(
        stationWebSocketClient,
        station,
        operationName,
        {},
      );

      expect(request).toEqual(callMessage);
      expect(response).toEqual(callResultMessage);
      expect(stationWebSocketClient.callResultMessageFromCS).toBeNull();
      expect(stationWebSocketClient.expectingCallResult).toBeFalsy();
    });
  });

  describe('test waitForMessage', () => {
    let stationWebSocketClient: StationWebSocketClient;

    beforeEach(() => {
      stationWebSocketClient = stationWebSocketService.createStationWebSocket(station);
    });

    afterEach(() => {
      jest.clearAllTimers();
    });
    it('clears interval and returns the callResultMessage when we get callResultMessage', () => {
      jest.useFakeTimers();

      const message = 'abcdef';

      stationWebSocketService.waitForMessage(stationWebSocketClient).then(result => {
        expect(result).toEqual(message);
      });
      expect(setInterval).toHaveBeenCalledTimes(1);

      stationWebSocketClient.callResultMessageFromCS = message;
      jest.advanceTimersToNextTimer();

      expect(clearInterval).toHaveBeenCalledTimes(1);
    });

    it('clears interval and returns null if nothing is returned', () => {
      jest.useFakeTimers();

      stationWebSocketService.waitForMessage(stationWebSocketClient).then(result => {
        expect(result).toBeNull();
      });
      expect(setInterval).toHaveBeenCalledTimes(1);

      for (let index = 0; index < 101; index++) {
        jest.advanceTimersToNextTimer();
      }

      expect(clearInterval).toHaveBeenCalledTimes(1);
    });
  });
});