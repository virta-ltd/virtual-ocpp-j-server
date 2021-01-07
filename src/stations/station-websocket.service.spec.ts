import { Test, TestingModule } from '@nestjs/testing';
import { StationWebSocketService } from './station-websocket.service';
import { Station } from './station.entity';
import { StationWebSocketClient } from './station-websocket-client';
import { BadRequestException } from '@nestjs/common';
import { ByChargePointOperationMessageGenerator } from '../message/by-charge-point/by-charge-point-operation-message-generator';
import { StationRepository } from './station.repository';
// @ts-ignore
import * as utils from './utils';
jest.mock('ws');

const mockStationRepository = () => ({
  updateStation: jest.fn(),
});

// https://stackoverflow.com/questions/52177631/jest-timer-and-promise-dont-work-well-settimeout-and-async-function
// https://github.com/facebook/jest/issues/2157
const flushPromises = () => new Promise(resolve => setImmediate(resolve));
describe('StationWebSocketService', () => {
  let station: Station;
  let stationWebSocketService: StationWebSocketService;
  let mockByChargePointOperationMessageGenerator = {
    createMessage: jest.fn(),
  };
  let stationRepository: StationRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: StationRepository,
          useFactory: mockStationRepository,
        },
        {
          provide: ByChargePointOperationMessageGenerator,
          useValue: mockByChargePointOperationMessageGenerator,
        },
        StationWebSocketService,
      ],
    }).compile();
    stationWebSocketService = module.get<StationWebSocketService>(StationWebSocketService);
    stationRepository = module.get<StationRepository>(StationRepository);

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
        const data = `[3,\"4\",{\"status\":\"Accepted\",\"currentTime\":\"2020-11-01T18:00:11.585620Z\",\"interval\":60}]`;

        stationWebSocketService.onMessage(stationWebSocketClient, station, data);

        expect(stationWebSocketClient.expectingCallResult).toBeFalsy();
        expect(stationWebSocketClient.callResultMessageFromCS).toBeNull();
      });

      it('test onMessage for but does not expect callResult', () => {
        const messageId = stationWebSocketClient.getMessageIdForCall();

        const data = `[3,\"${messageId}\",{\"currentTime\":\"2020-11-01T18:08:19.170Z\"}]`;

        stationWebSocketService.onMessage(stationWebSocketClient, station, data);

        expect(stationWebSocketClient.expectingCallResult).toBeFalsy();
        expect(stationWebSocketClient.callResultMessageFromCS).toBeNull();
      });

      it('test onMessage when expecting callResult', () => {
        const messageId = stationWebSocketClient.getMessageIdForCall();
        stationWebSocketClient.expectingCallResult = true;

        const data = `[3,\"${messageId}\",{\"currentTime\":\"2020-11-01T18:08:19.170Z\"}]`;

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
      stationWebSocketService.onConnectionOpen(stationWebSocketClient, station);

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
      stationWebSocketClient.heartbeatInterval = setInterval(() => {}, 1000);
      stationWebSocketClient.meterValueInterval = setInterval(() => {}, 1000);
      stationWebSocketService.onConnectionClosed(stationWebSocketClient, station, 1005, 'needs to be closed');

      expect(clearInterval).toHaveBeenCalledWith(stationWebSocketClient.heartbeatInterval);
      expect(clearInterval).toHaveBeenCalledWith(stationWebSocketClient.meterValueInterval);
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

    it('updates station meter value if operationName is StopTransaction', async () => {
      const operationName = 'StopTransaction';
      mockByChargePointOperationMessageGenerator.createMessage.mockReturnValue('some message');
      jest.spyOn(stationWebSocketService, 'waitForMessage').mockResolvedValue('abcdef');
      station.updatedAt = new Date();
      await stationWebSocketService.prepareAndSendMessageToCentralSystem(
        stationWebSocketClient,
        station,
        operationName,
        {},
      );
      expect(stationRepository.updateStation).toHaveBeenCalledWith(station, {
        meterValue: expect.any(Number),
      });
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

      for (let index = 0; index < 101; index++) {
        jest.advanceTimersToNextTimer();
      }

      expect(clearInterval).toHaveBeenCalledTimes(1);
    });
  });

  describe('processCallMsgFromCS', () => {
    let stationWebSocketClient: StationWebSocketClient;
    const uniqueId = 'abc';
    beforeEach(() => {
      stationWebSocketClient = stationWebSocketService.createStationWebSocket(station);
      stationWebSocketService.prepareAndSendMessageToCentralSystem = jest.fn();
      station.reload = jest.fn().mockResolvedValue(station);
      station.save = jest.fn().mockResolvedValue(station);
    });

    test('parseErrorMessage', () => {
      const requestMessage = 'abc';

      stationWebSocketService.processCallMsgFromCS(stationWebSocketClient, station, requestMessage);

      expect(stationWebSocketClient.send).not.toHaveBeenCalled();
    });

    describe('RemoteStartTransaction', () => {
      it('accepts request and sends back StartTransaction with idTag', () => {
        const idTag = 'TEST_IDTAG';
        const requestMessage = `[2,"${uniqueId}","RemoteStartTransaction",{"idTag":"TEST_IDTAG","connectorId":1}]`;
        const responseMessage = `[3,"${uniqueId}",{"status":"Accepted"}]`;

        stationWebSocketService.processCallMsgFromCS(stationWebSocketClient, station, requestMessage);

        expect(stationWebSocketClient.send).toHaveBeenCalledWith(responseMessage);
        expect(
          stationWebSocketService.prepareAndSendMessageToCentralSystem,
        ).toHaveBeenCalledWith(stationWebSocketClient, station, 'StartTransaction', { idTag });
      });
    });

    describe('RemoteStopTransaction', () => {
      it('gets rejected if currentTransactionId does not match', async () => {
        station.currentTransactionId = 10;
        const requestMessage = `[2,"${uniqueId}","RemoteStopTransaction",{"transactionId":20}]`;
        const responseMessage = `[3,"${uniqueId}",{"status":"Rejected"}]`;

        await stationWebSocketService.processCallMsgFromCS(stationWebSocketClient, station, requestMessage);

        expect(stationWebSocketClient.send).toHaveBeenCalledWith(responseMessage);
        expect(stationWebSocketService.prepareAndSendMessageToCentralSystem).not.toHaveBeenCalled();
      });

      it('gets accepted if currentTransactionId match', async () => {
        station.currentTransactionId = 10;
        const requestMessage = `[2,"${uniqueId}","RemoteStopTransaction",{"transactionId":${station.currentTransactionId}}]`;
        const responseMessage = `[3,"${uniqueId}",{"status":"Accepted"}]`;

        await stationWebSocketService.processCallMsgFromCS(stationWebSocketClient, station, requestMessage);

        expect(stationWebSocketClient.send).toHaveBeenCalledWith(responseMessage);
        expect(stationWebSocketService.prepareAndSendMessageToCentralSystem).toHaveBeenCalledWith(
          stationWebSocketClient,
          station,
          'StopTransaction',
          {},
        );
      });
    });

    describe('Reset', () => {
      it('resets station chargeInProgress & currentTransactionId', async () => {
        station.chargeInProgress = true;
        station.currentTransactionId = 10;
        const requestMessage = `[2,"${uniqueId}","Reset",{"type":"Hard"}]`;
        const responseMessage = `[3,"${uniqueId}",{"status":"Accepted"}]`;

        await stationWebSocketService.processCallMsgFromCS(stationWebSocketClient, station, requestMessage);

        expect(stationWebSocketClient.send).toHaveBeenCalledWith(responseMessage);
        expect(station.save).toHaveBeenCalledTimes(1);
        expect(station.chargeInProgress).toEqual(false);
        expect(station.currentTransactionId).toEqual(null);
        expect(stationWebSocketClient.close).toHaveBeenCalledWith(1012, 'Reset requested by Central System');
      });
    });
  });

  describe('processCallResultMsgFromCS', () => {
    let stationWebSocketClient: StationWebSocketClient;

    beforeEach(() => {
      stationWebSocketClient = stationWebSocketService.createStationWebSocket(station);
    });

    describe('Unsupported message Or parse error', () => {
      it('does not do anything if operation is not included', () => {
        stationWebSocketClient.callMessageOperationFromStation = 'Heartbeat';

        const response = `[3,"28",{"currentTime":"2020-11-04T10:00:05.627Z"}]`;

        stationWebSocketService.processCallResultMsgFromCS(stationWebSocketClient, station, response);

        expect(stationRepository.updateStation).not.toHaveBeenCalled();
      });

      it('does not do anything if response cannot be parsed', () => {
        stationWebSocketClient.callMessageOperationFromStation = 'Heartbeat';
        const response = `abc`;

        stationWebSocketService.processCallResultMsgFromCS(stationWebSocketClient, station, response);

        expect(stationRepository.updateStation).not.toHaveBeenCalled();
      });
    });
    describe('StartTransaction', () => {
      beforeEach(() => {
        stationWebSocketClient.callMessageOperationFromStation = 'StartTransaction';
      });
      afterEach(() => {
        jest.clearAllTimers();
      });

      it('does nothing if idTagInfo status is Blocked', () => {
        const response = `[3,"9",{"transactionId":0,"idTagInfo":{"status":"Blocked","expiryDate":"2020-11-04T10:46:50Z"}}]`;

        stationWebSocketService.processCallResultMsgFromCS(stationWebSocketClient, station, response);
        expect(stationRepository.updateStation).not.toHaveBeenCalled();
        expect(stationWebSocketClient.callMessageOperationFromStation).toStrictEqual('');
      });

      it('does nothing if transactionId is < 0', () => {
        const response = `[3,"9",{"transactionId":0,"idTagInfo":{"status":"Accepted","expiryDate":"2020-11-04T10:46:50Z"}}]`;

        stationWebSocketService.processCallResultMsgFromCS(stationWebSocketClient, station, response);
        expect(stationRepository.updateStation).not.toHaveBeenCalled();
        expect(stationWebSocketClient.callMessageOperationFromStation).toStrictEqual('');
      });

      it('update station chargeInProgress & currentTransactionId if status is Accepted and transactionId > 0', async () => {
        jest.useFakeTimers();
        const usedPower = 20;
        const initialMeterValue = 10;
        jest.spyOn(utils, 'calculatePowerUsageInWh').mockReturnValue(usedPower);
        station.meterValue = initialMeterValue;
        station.updatedAt = new Date();
        station.reload = jest.fn().mockResolvedValue(station);
        station.save = jest.fn().mockResolvedValue(station);
        const messageId = stationWebSocketClient.getMessageIdForCall();
        const transactionId = 1;
        const response = `[3,"${messageId}",{"transactionId":${transactionId},"idTagInfo":{"status":"Accepted","expiryDate":"2020-11-04T10:46:50Z"}}]`;

        stationWebSocketService.processCallResultMsgFromCS(stationWebSocketClient, station, response);
        expect(stationRepository.updateStation).toHaveBeenCalledWith(
          station,
          expect.objectContaining({ chargeInProgress: true, currentTransactionId: transactionId }),
        );

        const message = 'messagetext';
        mockByChargePointOperationMessageGenerator.createMessage = jest.fn().mockReturnValue(message);

        expect(clearInterval).toHaveBeenCalled();
        expect(setInterval).toHaveBeenCalledTimes(1);
        expect(stationWebSocketClient.meterValueInterval).not.toBeNull();
        expect(stationWebSocketClient.callMessageOperationFromStation).toStrictEqual('');
        jest.advanceTimersByTime(60000);
        await flushPromises();
        expect(station.reload).toHaveBeenCalledTimes(1);
        expect(station.save).toHaveBeenCalledTimes(1);
        expect(station.meterValue).toEqual(initialMeterValue + usedPower);
        expect(mockByChargePointOperationMessageGenerator.createMessage).toHaveBeenCalledWith(
          'MeterValues',
          station,
          stationWebSocketClient.lastMessageId,
          { value: station.meterValue },
        );
        expect(stationWebSocketClient.send).toHaveBeenCalledWith(message);
      });
    });

    describe('StopTransaction', () => {
      beforeEach(() => {
        jest.useFakeTimers();
        stationWebSocketClient.callMessageOperationFromStation = 'StopTransaction';
        stationWebSocketClient.meterValueInterval = setInterval(() => {}, 60000);
      });

      afterEach(() => {
        jest.clearAllTimers();
      });

      it('does nothing if idTagInfo status is not Accepted', () => {
        const response = `[3,"15",{"idTagInfo":{"status":"Blocked","expiryDate":"2020-11-04T09:53:59.031Z"}}]`;

        stationWebSocketService.processCallResultMsgFromCS(stationWebSocketClient, station, response);
        expect(stationWebSocketClient.meterValueInterval).not.toBeNull();
        expect(stationRepository.updateStation).not.toHaveBeenCalled();
      });

      it('update station chargeInProgress & currentTransactionId if status is Accepted', () => {
        const messageId = stationWebSocketClient.getMessageIdForCall();
        const response = `[3,"${messageId}",{"idTagInfo":{"status":"Accepted","expiryDate":"2020-11-04T10:57:41Z"}}]`;

        stationWebSocketService.processCallResultMsgFromCS(stationWebSocketClient, station, response);

        expect(stationRepository.updateStation).toHaveBeenCalledWith(
          station,
          expect.objectContaining({ chargeInProgress: false, currentTransactionId: null }),
        );
        expect(stationWebSocketClient.meterValueInterval).toBeNull();
      });
    });
  });
});
