import { Logger } from '@nestjs/common';
import * as WebSocket from 'ws';
import { ChargePointMessageTypes } from '../models/ChargePointMessageTypes';
import { Station } from './station.entity';

export class StationWebSocket {
  public station: Station;
  public wsClient: WebSocket;
  public connectedTime: Date;
  public pingInterval: NodeJS.Timeout;
  private lastMessageId: number;
  private logger = new Logger('StationnWebSocket');
  public constructor(station: Station) {
    this.station = station;
    this.lastMessageId = 0;

    this.createConnection();
    this.bindMethods();
  }

  private bindMethods() {
    this.wsClient.on('message', this.onMessage);
    this.wsClient.on('open', this.onConnectionOpen);
    this.wsClient.on('error', this.onError);
    this.wsClient.on('close', this.onConnectionClosed);
  }

  private createConnection() {
    this.logger.log(`creating new connection ${this.station.identity}`);
    const protocols = 'ocpp1.6';
    try {
      this.wsClient = new WebSocket(`${this.station.centralSystemUrl}/${this.station.identity}`, protocols);
    } catch (error) {
      this.logger.log(`Error connecting for station ${this.station.identity}: ${error?.message ?? ''}`);
    }
  }

  public getLastMessageId = (): number => this.lastMessageId;

  /**
   * Generate a uniqueId for Call message
   */
  public getMessageIdForCall = (): number => (this.lastMessageId += 1);

  public onMessage = (data: string) => {
    const parsedMessage = JSON.parse(data);
    const messageType = parsedMessage[0] as ChargePointMessageTypes;
    switch (messageType) {
      case ChargePointMessageTypes.Call: {
        // remoteStart, remoteStop
        const [, uniqueId, action, payload] = parsedMessage as [number, string, string, object];
        this.logger.log(parsedMessage);
        break;
      }
      case ChargePointMessageTypes.CallResult: {
        const [, reqId, payload] = parsedMessage as [number, string, object];
        if (reqId === this.getLastMessageId().toString()) {
          this.logger.log(`Received response for reqId ${this.getLastMessageId} `);
          this.logger.log(payload);
        }
        break;
      }
      default:
        this.logger.log('data does not have correct messageTypeId');
    }
  };

  public onError(err: Error) {
    this.logger.error(`Error: ${err?.message ?? ''}`, err.stack ?? '');
  }

  public onConnectionOpen = () => {
    this.connectedTime = new Date();

    this.pingInterval = setInterval(() => {
      this.logger.log('pinging server by station', this.station.identity);
      this.wsClient.ping('ping');
    }, 60000);

    this.logger.log(`connection opened for station ${this.station.identity}, sending Boot`);

    // testing closing
    // setTimeout(() => {
    //   if (this.station.identity == 'STATION123') {
    //     this.wsClient.close(1000, 'Testing');
    //   }
    // }, 10000);

    // this.wsClient.on('pong', () => {
    //   this.logger.log('received pong back');
    // });
  };

  public onConnectionClosed = (code: number, reason: string) => {
    clearInterval(this.pingInterval);

    const connectedDurationInSeconds = (new Date().getTime() - this.connectedTime.getTime()) / 1000;
    const connectedMinutes = Math.floor(connectedDurationInSeconds / 60);
    const extraConnectedSeconds = connectedDurationInSeconds % 60;
    this.logger.log(`Duration of the connection: ${connectedMinutes} minutes & ${extraConnectedSeconds} seconds.
Closing connection ${this.station.identity}. Code: ${code}. Reason: ${reason}.`);

    this.wsClient = null;

    // reconnecting after 1 minute
    setTimeout(() => {
      this.createConnection();
      this.bindMethods();
    }, 60000);
  };
}
