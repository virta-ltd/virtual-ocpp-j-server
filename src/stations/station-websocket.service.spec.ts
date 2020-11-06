import { Test, TestingModule } from '@nestjs/testing';
import { StationWebSocketService } from './station-websocket.service';
import { Station } from './station.entity';
import { StationWebSocketClient } from './station-websocket-client';
import { BadRequestException } from '@nestjs/common';
import { ByChargePointOperationMessageGenerator } from '../message/by-charge-point/by-charge-point-operation-message-generator';
import { StationRepository } from './station.repository';
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
        stationWebSocketClient.getLastMessageId(),
      );

      const sendFn = jest.spyOn(stationWebSocketClient, 'send');
      expect(sendFn).toHaveBeenNthCalledWith(1, expect.stringContaining('BootNotification'));

      mockByChargePointOperationMessageGenerator.createMessage.mockReturnValue(`[2,\"16\",\"Heartbeat\",{}]`);
      jest.runTimersToTime(60000);

      expect(sendFn).toHaveBeenLastCalledWith(expect.stringContaining('Heartbeat'));
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
        stationWebSocketClient.getLastMessageId(),
      );

      expect(setInterval).toHaveBeenCalledTimes(2);
      expect(stationWebSocketClient.heartbeatInterval).not.toBeNull();
      expect(stationWebSocketClient.meterValueInterval).not.toBeNull();

      jest.runTimersToTime(60000);
      await flushPromises();

      expect(mockByChargePointOperationMessageGenerator.createMessage).toHaveBeenLastCalledWith(
        'MeterValues',
        station,
        stationWebSocketClient.getLastMessageId(),
        expect.objectContaining({ value: station.meterValue }),
      );
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
      mockByChargePointOperationMessageGenerator.createMessage.mockReturnValue('');
      expect(
        stationWebSocketService.sendMessageToCentralSystem(stationWebSocketClient, station, operationName, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('sends message to CentralSystem based on params', async () => {
      const operationName = 'Heartbeat';

      const callMessage = `[2,"4","Heartbeat",{}]`;
      const callResultMessage = '[3,"4",{"currentTime":"2020-11-01T18:08:19.170Z"}]';

      mockByChargePointOperationMessageGenerator.createMessage.mockReturnValue(callMessage);
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

  describe('processCallResultMsgFromCS', () => {
    let stationWebSocketClient: StationWebSocketClient;

    beforeEach(() => {
      stationWebSocketClient = stationWebSocketService.createStationWebSocket(station);
    });
    describe('Unsupported message Or parse error', () => {
      it('does not do anything if operation is not included', () => {
        const operationName = 'Heartbeat';

        const response = `[3,"28",{"currentTime":"2020-11-04T10:00:05.627Z"}]`;

        stationWebSocketService.processCallResultMsgFromCS(operationName, station, response, stationWebSocketClient);

        expect(stationRepository.updateStation).not.toHaveBeenCalled();
      });

      it('does not do anything if response cannot be parsed', () => {
        const operationName = 'Heartbeat';
        const response = `abc`;

        stationWebSocketService.processCallResultMsgFromCS(operationName, station, response, stationWebSocketClient);

        expect(stationRepository.updateStation).not.toHaveBeenCalled();
      });
    });
    describe('StartTransaction', () => {
      const operationName = 'StartTransaction';
      afterEach(() => {
        jest.clearAllTimers();
      });

      it('does nothing if idTagInfo status is Blocked', () => {
        const response = `[3,"9",{"transactionId":0,"idTagInfo":{"status":"Blocked","expiryDate":"2020-11-04T10:46:50Z"}}]`;

        stationWebSocketService.processCallResultMsgFromCS(operationName, station, response, stationWebSocketClient);
        expect(stationRepository.updateStation).not.toHaveBeenCalled();
      });

      it('does nothing if transactionId is < 0', () => {
        const response = `[3,"9",{"transactionId":0,"idTagInfo":{"status":"Accepted","expiryDate":"2020-11-04T10:46:50Z"}}]`;

        stationWebSocketService.processCallResultMsgFromCS(operationName, station, response, stationWebSocketClient);
        expect(stationRepository.updateStation).not.toHaveBeenCalled();
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
        const transactionId = 1;
        const response = `[3,"9",{"transactionId":${transactionId},"idTagInfo":{"status":"Accepted","expiryDate":"2020-11-04T10:46:50Z"}}]`;

        stationWebSocketService.processCallResultMsgFromCS(operationName, station, response, stationWebSocketClient);
        expect(stationRepository.updateStation).toHaveBeenCalledWith(
          station,
          expect.objectContaining({ chargeInProgress: true, currentTransactionId: transactionId }),
        );

        const message = 'messagetext';
        mockByChargePointOperationMessageGenerator.createMessage = jest.fn().mockReturnValue(message);

        expect(clearInterval).toHaveBeenCalled();
        expect(setInterval).toHaveBeenCalledTimes(1);
        expect(stationWebSocketClient.meterValueInterval).not.toBeNull();
        jest.advanceTimersByTime(60000);
        await flushPromises();
        expect(station.reload).toHaveBeenCalledTimes(1);
        expect(station.save).toHaveBeenCalledTimes(1);
        expect(station.meterValue).toEqual(initialMeterValue + usedPower);
        expect(mockByChargePointOperationMessageGenerator.createMessage).toHaveBeenCalledWith(
          'MeterValues',
          station,
          stationWebSocketClient.getLastMessageId(),
          { value: station.meterValue },
        );
        expect(stationWebSocketClient.send).toHaveBeenCalledWith(message);
      });
    });

    describe('StopTransaction', () => {
      const operationName = 'StopTransaction';
      it('does nothing if idTagInfo status is not Accepted', () => {
        const response = `[3,"15",{"idTagInfo":{"status":"Blocked","expiryDate":"2020-11-04T09:53:59.031Z"}}]`;

        stationWebSocketService.processCallResultMsgFromCS(operationName, station, response, stationWebSocketClient);
        expect(stationRepository.updateStation).not.toHaveBeenCalled();
      });

      it('update station chargeInProgress & currentTransactionId if status is Accepted', () => {
        const response = `[3,"24",{"idTagInfo":{"status":"Accepted","expiryDate":"2020-11-04T10:57:41Z"}}]`;

        stationWebSocketService.processCallResultMsgFromCS(operationName, station, response, stationWebSocketClient);

        expect(stationRepository.updateStation).toHaveBeenCalledWith(
          station,
          expect.objectContaining({ chargeInProgress: false, currentTransactionId: null }),
        );
      });
    });
  });
});
