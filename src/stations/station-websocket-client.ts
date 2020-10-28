import * as WebSocket from 'ws';

export class StationWebSocketClient extends WebSocket {
  public stationIdentity: string = '';
  public connectedTime: Date = null;
  public heartbeatInterval: NodeJS.Timeout = null;
  public lastMessageId: number = 0;
  public getLastMessageId = (): number => this.lastMessageId;
  public getMessageIdForCall = (): number => (this.lastMessageId += 1);
}
