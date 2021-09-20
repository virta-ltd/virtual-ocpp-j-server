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

    it('creates a timeout to clear operationName', () => {
      jest.useFakeTimers();
      const client = new StationWebSocketClient('localhost');
      client.send = jest.fn();
      const message = 'abc';
      const operationName = 'somename';

      client.sendCallMsgForOperation(message, operationName);

      expect(client.callMessageOperationFromStation).toEqual(operationName);

      const timerInMs =
        Number(process.env.WAIT_FOR_MESSAGE_CHECK_INTERVAL_IN_MS) *
        Number(process.env.WAIT_FOR_MESSAGE_CHECK_MAX_ATTEMPTS);
      jest.advanceTimersByTime(timerInMs);

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

  describe('connection check interval & pongHandler', () => {
    it('sets isAlive to false when connectionCheck is run', () => {
      jest.useFakeTimers();
      const client = new StationWebSocketClient('localhost');
      client.createConnectionCheckInterval();
      jest.advanceTimersToNextTimer();
      expect(client.isAlive).toBeFalsy();
    });

    it('terminates connection when isAlive is false and connection check interval is run', () => {
      jest.useFakeTimers();
      const client = new StationWebSocketClient('localhost');
      client.createConnectionCheckInterval();
      jest.advanceTimersToNextTimer();
      expect(client.isAlive).toBeFalsy();

      jest.advanceTimersToNextTimer(); // next timer will terminate connection if isAlive is false
      expect(client.terminate).toHaveBeenCalledTimes(1);
    });

    it('sets isAlive to true when pongHandler is called', () => {
      jest.useFakeTimers();
      const client = new StationWebSocketClient('localhost');
      client.createConnectionCheckInterval();
      jest.advanceTimersToNextTimer();

      expect(client.isAlive).toBeFalsy();
      client.pongHandler();
      expect(client.isAlive).toBeTruthy();
    });

    it('clearTimeout is run for connectionCheckInterval', () => {
      jest.useFakeTimers();
      const client = new StationWebSocketClient('localhost');
      client.createConnectionCheckInterval();
      client.clearConnectionCheckInterval();
      expect(clearTimeout).toHaveBeenCalledWith(expect.anything())
    });
  });
});
