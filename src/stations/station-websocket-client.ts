import { Logger } from '@nestjs/common';
import * as WebSocket from 'ws';

export class StationWebSocketClient extends WebSocket {
  private logger = new Logger(StationWebSocketClient.name);
  private _lastMessageId: number = 0;
  public stationIdentity: string = '';
  public connectedTime: Date = null;
  public heartbeatInterval: NodeJS.Timeout = null;
  public meterValueInterval: NodeJS.Timeout = null;
  public callResultMessageFromCS?: string = null;
  public expectingCallResult: boolean = false;
  private _callMessageOperationFromStation: string = '';
  private removeCallMsgOperationNameTimer: NodeJS.Timeout = null;
  private _pendingMessageId: number = 0;

  public get callMessageOperationFromStation() {
    return this._callMessageOperationFromStation;
  }

  public set callMessageOperationFromStation(operation) {
    this._callMessageOperationFromStation = operation;
  }

  public get lastMessageId(): number {
    return this._lastMessageId;
  }

  public get pendingMessageId(): number {
    return this._pendingMessageId;
  }

  public getMessageIdForCall = (): number => {
    this._pendingMessageId = this.lastMessageId + 1;
    return this._pendingMessageId;
  };

  public sendCallMsgForOperation(msg: string, operationName: string) {
    if (this.callMessageOperationFromStation) {
      this.logger.error(`Ongoing operation: ${this.callMessageOperationFromStation}. Not sending ${msg}`);
      return;
    }

    this._lastMessageId = this._pendingMessageId;
    this.send(msg);
    this.callMessageOperationFromStation = operationName;

    this.removeCallMsgOperationNameTimer = setTimeout(() => {
      this.callMessageOperationFromStation = '';
    }, 10000);
  }

  public clearRemoveCallMsgOperationNameTimer = () => {
    clearTimeout(this.removeCallMsgOperationNameTimer);
  };

  public isLastMessageIdSimilar(reqId: string) {
    return this._lastMessageId.toString() === reqId;
  }
}
