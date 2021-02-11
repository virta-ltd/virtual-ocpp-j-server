import { StationWebSocketClient } from './station-websocket-client';

jest.mock('ws');
describe('StationWebSocketClient', () => {
  it('creates new WebSocket with custom default value', () => {
    const client = new StationWebSocketClient('abc');
    expect(client.stationIdentity).toEqual('');
    expect(client.connectedTime).toBeNull();
    expect(client.heartbeatInterval).toBeNull();
    expect(client.lastMessageId).toBe(0);
    expect(client.getMessageIdForCall()).toBe(1);
  });

  describe('callMessageOperationFromStation', () => {
    it('set & get _callMessageOperationFromStation', () => {
      const client = new StationWebSocketClient('localhost');
      expect(client.callMessageOperationFromStation).toEqual('');

      client.callMessageOperationFromStation = 'test';
      expect(client.callMessageOperationFromStation).toEqual('test');
    });
  });

  describe('test messageId', () => {
    let client: StationWebSocketClient;
    beforeEach(() => {
      client = new StationWebSocketClient('localhost');
    });

    it('test lastMessageId & getMessageId for call', () => {
      expect(client.lastMessageId).toEqual(0);
      expect(client.getMessageIdForCall()).toEqual(1);

      expect(client.pendingMessageId).toEqual(1);
      expect(client.lastMessageId).toEqual(0);
    });

    it('returns true if reqId is equal', () => {
      jest.useFakeTimers();
      expect(client.getMessageIdForCall()).toEqual(1);
      client.sendCallMsgForOperation('abc', 'def');
      expect(client.isLastMessageIdSimilar('1')).toBeTruthy();
    });

    it('returns false if reqId is not equal', () => {
      expect(client.getMessageIdForCall()).toEqual(1);
      expect(client.isLastMessageIdSimilar('2')).toBeFalsy();
    });
  });

  describe('sendCallMsgForOperation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.clearAllTimers();
    });

    it('does not send message if there is ongoing callMessageOperation', () => {
      const client = new StationWebSocketClient('localhost');
      client.send = jest.fn();
      client.callMessageOperationFromStation = 'BootNotification';

      client.sendCallMsgForOperation('message_data', 'MeterValues');

      expect(client.send).not.toHaveBeenCalled();
    });

    it('sets lastMessageId, sets operationName & send message', () => {
      const client = new StationWebSocketClient('localhost');
      client.send = jest.fn();
      const message = 'abc';
      const operationName = 'some_name';
      const messageId = client.getMessageIdForCall();

      expect(client.lastMessageId).not.toEqual(messageId);

      client.sendCallMsgForOperation(message, operationName);

      expect(client.lastMessageId).toEqual(messageId);
      expect(client.send).toHaveBeenCalledWith(message);
      expect(client.callMessageOperationFromStation).toEqual(operationName);
    });

    it('creates a timeout to clear operationName for 10 seconds', () => {
      jest.useFakeTimers();
      const client = new StationWebSocketClient('localhost');
      client.send = jest.fn();
      const message = 'abc';
      const operationName = 'somename';

      client.sendCallMsgForOperation(message, operationName);

      expect(client.callMessageOperationFromStation).toEqual(operationName);

      jest.advanceTimersByTime(10000);

      expect(client.callMessageOperationFromStation).toEqual('');
    });
  });

  describe('clearRemoveCallMsgOperationNameTimer', () => {
    it('clears timeout of removeCallMsgOperationNameTimer', () => {
      jest.useFakeTimers();
      const client = new StationWebSocketClient('localhost');
      client.clearRemoveCallMsgOperationNameTimer();

      expect(clearTimeout).toHaveBeenCalled();
    });
  });
});
