import * as WebSocket from 'ws';

export class StationWebSocketClient extends WebSocket {
  private _lastMessageId: number = 0;
  public stationIdentity: string = '';
  public connectedTime: Date = null;
  public heartbeatInterval: NodeJS.Timeout = null;
  public meterValueInterval: NodeJS.Timeout = null;
  public callResultMessageFromCS?: string = null;
  public expectingCallResult: boolean = false;
  private _callMessageOperationFromStation: string = '';

  public get callMessageOperationFromStation() {
    return this._callMessageOperationFromStation;
  }
  public set callMessageOperationFromStation(operation) {
    this._callMessageOperationFromStation = operation;
  }

  public get lastMessageId(): number {
    return this._lastMessageId;
  }
  public getMessageIdForCall = (): number => (this._lastMessageId += 1);
}
