import * as WebSocket from 'ws';

export class StationWebSocketClient extends WebSocket {
  public stationIdentity: string = '';
  public connectedTime: Date = null;
  public heartbeatInterval: NodeJS.Timeout = null;
  private lastMessageId: number = 0;
  public callMessageFromCS?: string = null;
  public callResultMessageFromCS?: string = null;
  public expectingCallResult: boolean = false;

  public getLastMessageId = (): number => this.lastMessageId;
  public getMessageIdForCall = (): number => (this.lastMessageId += 1);
}
