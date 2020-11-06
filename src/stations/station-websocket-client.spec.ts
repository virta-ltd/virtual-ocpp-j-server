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
});
