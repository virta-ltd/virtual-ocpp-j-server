import { Test, TestingModule } from '@nestjs/testing';
import { StationWebSocketService } from './station-websocket.service';
import { Station } from './station.entity';
import { StationWebSocketClient } from './station-websocket-client';
import { BadRequestException } from '@nestjs/common';
import { ByChargePointOperationMessageGenerator } from '../message/by-charge-point/by-charge-point-operation-message-generator';
import * as utils from './utils';
import { flushPromises } from '../jest/helper';
import { CallMsgHandlerFactory } from './handler/call-msg/call-msg-handler-factory';
import { CallResultMsgHandlerFactory } from './handler/call-result-msg/call-result-msg-handler-factory';
import { CallMsgHandlerInterface } from './handler/call-msg/call-msg-handler-interface';
import { CallResultMsgHandlerInterface } from './handler/call-result-msg/call-result-msg-handler-interface';
jest.mock('ws');

describe('StationWebSocketService', () => {
  let station: Station;
  let stationWebSocketService: StationWebSocketService;
  const mockByChargePointOperationMessageGenerator = {
    createMessage: jest.fn(),
  };
  let callMsgHandlerFactory: CallMsgHandlerFactory;
  let callResultMsgHandlerFactory: CallResultMsgHandlerFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CallMsgHandlerFactory,
          useValue: {
            getHandler: jest.fn(),
          },
        },
        {
          provide: CallResultMsgHandlerFactory,
          useValue: {
            getHandler: jest.fn(),
          },
        },
        {
          provide: ByChargePointOperationMessageGenerator,
          useValue: mockByChargePointOperationMessageGenerator,
        },
        StationWebSocketService,
      ],
    }).compile();
    stationWebSocketService = module.get<StationWebSocketService>(StationWebSocketService);
    callMsgHandlerFactory = module.get<CallMsgHandlerFactory>(CallMsgHandlerFactory);
    callResultMsgHandlerFactory = module.get<CallResultMsgHandlerFactory>(CallResultMsgHandlerFactory);

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
      expect(onFn).toHaveBeenCalledWith('pong', expect.any(Function));
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

      describe('message cannot be parsed', () => {
        it('tests bad message that cannot be parsed', () => {
          const data = `random data`;

          stationWebSocketService.onMessage(stationWebSocketClient, station, data);

          expect(callMsgHandlerFactory.getHandler).not.toHaveBeenCalled();
          expect(callResultMsgHandlerFactory.getHandler).not.toHaveBeenCalled();
        });
      });

      describe('onMessage for CallMessage type', () => {
        const operationName = 'RemoteStartTransaction';
        const data = `[2,\"6fbde719-c7aa-40c4-b4f9-282edbfd502e\",\"${operationName}\",{\"idTag\":\"CUID40041\",\"connectorId\":1}]`;
        it('test that callMsgHandlerFactory is called and handle method is called', () => {
          const mockHandler: CallMsgHandlerInterface = { handle: jest.fn() };
          callMsgHandlerFactory.getHandler = jest.fn().mockReturnValue(mockHandler);

          stationWebSocketService.onMessage(stationWebSocketClient, station, data);

          expect(callMsgHandlerFactory.getHandler).toHaveBeenCalledWith(operationName);
          expect(mockHandler.handle).toHaveBeenCalledWith(stationWebSocketClient, station, data);
        });

        it('test that handle method is not called if callMsgHandlerFactory returns null', () => {
          callMsgHandlerFactory.getHandler = jest.fn().mockReturnValue(null);

          stationWebSocketService.onMessage(stationWebSocketClient, station, data);

          expect(callMsgHandlerFactory.getHandler).toHaveBeenCalledWith(operationName);
        });
      });

      describe('onMessage for CallResult message type', () => {
        const operationName = 'StopTransaction';

        beforeEach(() => {
          stationWebSocketClient.callMessageOperationFromStation = operationName;
          stationWebSocketClient.clearRemoveCallMsgOperationNameTimer = jest.fn();
        });

        it('tests that CallResultMsgHandlerFactory.getHandler is not called if reqId does not match', () => {
          stationWebSocketClient.isLastMessageIdSimilar = jest.fn().mockReturnValue(false);
          const messageId = 2000;
          const data = `[3,"${messageId}",{"idTagInfo":{"status":"Accepted","expiryDate":"2021-02-09T14:55:54Z"}}]`;

          stationWebSocketClient.callMessageOperationFromStation = operationName;
          stationWebSocketService.onMessage(stationWebSocketClient, station, data);

          expect(stationWebSocketClient.isLastMessageIdSimilar).toHaveBeenCalledWith(`${messageId}`);
          expect(callResultMsgHandlerFactory.getHandler).not.toHaveBeenCalled();
          expect(stationWebSocketClient.clearRemoveCallMsgOperationNameTimer).not.toHaveBeenCalled();
        });

        it('tests that getHandler is called when messageId is correct, handle() is called from handler, callMessageOperationFromStation & callResultMessageFromCS are emptied', () => {
          stationWebSocketClient.isLastMessageIdSimilar = jest.fn().mockReturnValue(true);
          const messageId = 3;
          const data = `[3,"${messageId}",{"idTagInfo":{"status":"Accepted","expiryDate":"2021-02-09T14:55:54Z"}}]`;

          const mockHandler: CallResultMsgHandlerInterface = { handle: jest.fn() };
          callResultMsgHandlerFactory.getHandler = jest.fn().mockReturnValue(mockHandler);

          stationWebSocketService.onMessage(stationWebSocketClient, station, data);

          expect(stationWebSocketClient.isLastMessageIdSimilar).toHaveBeenCalledWith(`${messageId}`);
          expect(callResultMsgHandlerFactory.getHandler).toHaveBeenCalledWith(operationName);
          expect(mockHandler.handle).toHaveBeenCalledWith(stationWebSocketClient, station, JSON.parse(data));
          expect(stationWebSocketClient.callMessageOperationFromStation).toEqual('');
          expect(stationWebSocketClient.expectingCallResult).toBeFalsy();
          expect(stationWebSocketClient.callResultMessageFromCS).toBeNull();
          expect(stationWebSocketClient.clearRemoveCallMsgOperationNameTimer).toHaveBeenCalled();
        });

        it('tests that callResultMessageFromCS is populated with sent message if client.expectingCallResult is true', () => {
          stationWebSocketClient.expectingCallResult = true;
          stationWebSocketClient.isLastMessageIdSimilar = jest.fn().mockReturnValue(true);

          const messageId = stationWebSocketClient.getMessageIdForCall();
          const data = `[3,"${messageId}",{"idTagInfo":{"status":"Accepted","expiryDate":"2021-02-09T14:55:54Z"}}]`;
          callResultMsgHandlerFactory.getHandler = jest.fn().mockReturnValue({ handle: jest.fn() });

          stationWebSocketService.onMessage(stationWebSocketClient, station, data);

          expect(stationWebSocketClient.callResultMessageFromCS).toEqual(data);
          expect(stationWebSocketClient.clearRemoveCallMsgOperationNameTimer).toHaveBeenCalled();
        });
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
      mockByChargePointOperationMessageGenerator.createMessage.mockReturnValue(
        `[2,\"10\",\"BootNotification\",{\"chargePointVendor\":\"Virtual\",\"chargePointModel\":\"OCPP-J 1.6\"}]`,
      );
      stationWebSocketService.onConnectionOpen(stationWebSocketClient, station);
      expect(stationWebSocketClient.stationIdentity).toEqual(station.identity);
      expect(stationWebSocketClient.connectedTime).toBeInstanceOf(Date);
      expect(setInterval).toHaveBeenCalled();
      expect(stationWebSocketClient.heartbeatInterval).not.toBeNull();
      expect(mockByChargePointOperationMessageGenerator.createMessage).toHaveBeenCalledWith(
        'BootNotification',
        station,
        stationWebSocketClient.lastMessageId,
      );

      const sendFn = jest.spyOn(stationWebSocketClient, 'send');
      expect(sendFn).toHaveBeenNthCalledWith(1, expect.stringContaining('BootNotification'));
      expect(stationWebSocketClient.callMessageOperationFromStation).toEqual('BootNotification');

      mockByChargePointOperationMessageGenerator.createMessage.mockReturnValue(`[2,\"16\",\"Heartbeat\",{}]`);
      jest.runTimersToTime(60000);

      expect(sendFn).toHaveBeenLastCalledWith(expect.stringContaining('Heartbeat'));
      expect(stationWebSocketClient.callMessageOperationFromStation).toEqual('Heartbeat');
    });

    it('creates meterValueInterval and does not send heartbeat when charge is in progress', async () => {
      jest.useFakeTimers();
      station.meterValue = 10;
      station.chargeInProgress = true;
      station.reload = jest.fn().mockResolvedValue(station);
      station.save = jest.fn().mockResolvedValue(station);
      jest.spyOn(utils, 'calculatePowerUsageInWh').mockReturnValue(20);
      mockByChargePointOperationMessageGenerator.createMessage.mockReturnValue(
        `[2,\"10\",\"BootNotification\",{\"chargePointVendor\":\"Virtual\",\"chargePointModel\":\"OCPP-J 1.6\"}]`,
      );
      stationWebSocketClient.createConnectionCheckInterval = jest.fn();
      stationWebSocketService.onConnectionOpen(stationWebSocketClient, station);

      expect(stationWebSocketClient.createConnectionCheckInterval).toHaveBeenCalledTimes(1);
      expect(stationWebSocketClient.stationIdentity).toEqual(station.identity);
      expect(stationWebSocketClient.connectedTime).toBeInstanceOf(Date);
      expect(mockByChargePointOperationMessageGenerator.createMessage).toHaveBeenCalledWith(
        'BootNotification',
        station,
        stationWebSocketClient.lastMessageId,
      );

      expect(setInterval).toHaveBeenCalledTimes(2);
      expect(stationWebSocketClient.heartbeatInterval).not.toBeNull();
      expect(stationWebSocketClient.meterValueInterval).not.toBeNull();

      jest.runTimersToTime(60000);
      await flushPromises();

      expect(mockByChargePointOperationMessageGenerator.createMessage).toHaveBeenLastCalledWith(
        'MeterValues',
        station,
        stationWebSocketClient.lastMessageId,
        expect.objectContaining({ value: station.meterValue }),
      );
    });

    it('test onClose function', () => {
      jest.useFakeTimers();
      stationWebSocketClient.connectedTime = new Date();
      stationWebSocketClient.heartbeatInterval = setInterval(() => null, 1000);
      stationWebSocketClient.meterValueInterval = setInterval(() => null, 1000);
      stationWebSocketClient.clearConnectionCheckInterval = jest.fn();
      stationWebSocketService.onConnectionClosed(stationWebSocketClient, station, 1005, 'needs to be closed');

      expect(clearInterval).toHaveBeenCalledWith(stationWebSocketClient.heartbeatInterval);
      expect(clearInterval).toHaveBeenCalledWith(stationWebSocketClient.meterValueInterval);
      expect(stationWebSocketClient.clearConnectionCheckInterval).toHaveBeenCalledTimes(1);
    });
  });

  describe('prepareAndSendMessageToCentralSystem', () => {
    let stationWebSocketClient: StationWebSocketClient;

    beforeEach(() => {
      stationWebSocketClient = stationWebSocketService.createStationWebSocket(station);
    });

    it('throws exception if operationName is not correct', async () => {
      const operationName = 'abc';
      mockByChargePointOperationMessageGenerator.createMessage.mockReturnValue('');
      expect(
        stationWebSocketService.prepareAndSendMessageToCentralSystem(
          stationWebSocketClient,
          station,
          operationName,
          {},
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('sends message to CentralSystem based on params', async () => {
      const operationName = 'Heartbeat';

      const callMessage = `[2,"4","Heartbeat",{}]`;
      const callResultMessage = '[3,"4",{"currentTime":"2020-11-01T18:08:19.170Z"}]';

      mockByChargePointOperationMessageGenerator.createMessage.mockReturnValue(callMessage);
      jest.spyOn(stationWebSocketService, 'waitForMessage').mockResolvedValue(callResultMessage);

      const { request, response } = await stationWebSocketService.prepareAndSendMessageToCentralSystem(
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

      for (let index = 0; index < Number(process.env.WAIT_FOR_MESSAGE_CHECK_MAX_ATTEMPTS) + 1; index++) {
        jest.advanceTimersToNextTimer();
      }

      expect(clearInterval).toHaveBeenCalledTimes(1);
    });
  });
});
