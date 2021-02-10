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
      expect(client.lastMessageId).toEqual(1);
    });

    it('returns true if reqId is equal', () => {
      expect(client.getMessageIdForCall()).toEqual(1);
      expect(client.isLastMessageIdSimilar('1')).toBeTruthy();
    });

    it('returns false if reqId is not equal', () => {
      expect(client.getMessageIdForCall()).toEqual(1);
      expect(client.isLastMessageIdSimilar('2')).toBeFalsy();
    });
  });

  describe('sendCallMsgForOperation', () => {
    it('sets operationName & send message', () => {
      const client = new StationWebSocketClient('localhost');
      client.send = jest.fn();
      const message = 'abc';
      const operationName = 'some_name';

      client.sendCallMsgForOperation(message, operationName);

      expect(client.send).toHaveBeenCalledWith(message);
      expect(client.callMessageOperationFromStation).toEqual(operationName);
    });
  });
});
