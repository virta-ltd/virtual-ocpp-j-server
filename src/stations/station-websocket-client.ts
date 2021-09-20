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
  private connectionCheckInterval: NodeJS.Timeout = null;
  private _isAlive = true;

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
    // if station has ongoing operation, do not attempt to send further message
    if (this.callMessageOperationFromStation) {
      this.logger.error(`Ongoing operation: ${this.callMessageOperationFromStation}. Not sending ${msg}`);
      return;
    }

    this._lastMessageId = this._pendingMessageId;
    this.logger.verbose(JSON.stringify(
      {
        message: "Sending message for station",
        stationIdentity: this.stationIdentity,
        operationName,
        rawMessage: msg,
      }
    ));
    this.send(msg);
    this.callMessageOperationFromStation = operationName;

    // calculate the time for the timeout to remove callMessageOperationFromStation
    // timeout is same as timeout in StationWebsocketService: waitForMessage function
    const {
      WAIT_FOR_MESSAGE_CHECK_INTERVAL_IN_MS: waitForMessageCheckIntervalInMs,
      WAIT_FOR_MESSAGE_CHECK_MAX_ATTEMPTS: waitForMessageCheckMaxAttempts,
    } = process.env;
    const removeCallMsgOperationNameTimeoutInMs =
      Number(waitForMessageCheckIntervalInMs) * Number(waitForMessageCheckMaxAttempts);

    // create a timeout to remove callMessageOperationFromStation so that the station can send message again
    this.removeCallMsgOperationNameTimer = setTimeout(() => {
      this.callMessageOperationFromStation = '';
    }, removeCallMsgOperationNameTimeoutInMs);
  }

  public clearRemoveCallMsgOperationNameTimer = () => {
    clearTimeout(this.removeCallMsgOperationNameTimer);
  };

  public isLastMessageIdSimilar(reqId: string) {
    return this._lastMessageId.toString() === reqId;
  }

  public createConnectionCheckInterval() {
    this.connectionCheckInterval = setInterval(() => {
      if (this._isAlive === false) {
        this.logger.log(`Connection from ${this.stationIdentity} is broken from ping-pong check. Terminating`)
        return this.terminate();
      }

      // sending Ping to Central System
      this._isAlive = false;
      this.ping();

    }, 60000);
  }

  public clearConnectionCheckInterval() {
    clearTimeout(this.connectionCheckInterval);
  }

  public pongHandler() {
    this._isAlive = true;
  }

  public get isAlive() {
    return this._isAlive;
  }
}
