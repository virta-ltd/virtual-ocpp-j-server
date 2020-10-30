import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ByChargePointOperationMessageFactory } from '../message/by-charge-point/by-charge-point-operation-message-factory';
import { ChargePointMessageTypes } from '../models/ChargePointMessageTypes';
import { StationWebSocketClient } from './station-websocket-client';
import { Station } from './station.entity';
import { StationRepository } from './station.repository';

@Injectable()
export class StationWebSocketService {
  private logger = new Logger(StationWebSocketService.name);
  constructor(
    // @InjectRepository(StationRepository)
    // private stationRepository: StationRepository,
    private byChargePointOperationMessageFactory: ByChargePointOperationMessageFactory,
  ) {}

  public createStationWebSocket = (station: Station): StationWebSocketClient => {
    let wsClient: StationWebSocketClient;
    const protocols = 'ocpp1.6';
    try {
      wsClient = new StationWebSocketClient(`${station.centralSystemUrl}/${station.identity}`, protocols);
    } catch (error) {
      this.logger.log(`Error connecting for station ${station.identity}: ${error?.message ?? ''}`);
      return null;
    }

    wsClient.on('open', () => this.onConnectionOpen(wsClient, station));
    wsClient.on('message', (data: string) => this.onMessage(wsClient, station, data));
    wsClient.on('error', error => this.onError(error));
    wsClient.on('close', (code: number, reason: string) => this.onConnectionClosed(wsClient, station, code, reason));
    return wsClient;
  };

  public onConnectionOpen = (wsClient: StationWebSocketClient, station: Station) => {
    this.logger.log(`connection opened for station ${station.identity}, sending Boot`);
    wsClient.stationIdentity = station.identity;
    wsClient.connectedTime = new Date();

    const bootMessage = this.byChargePointOperationMessageFactory.createMessage(
      'BootNotification',
      station,
      wsClient.getMessageIdForCall(),
    );
    wsClient.send(bootMessage);

    wsClient.heartbeatInterval = setInterval(() => {
      const message = this.byChargePointOperationMessageFactory.createMessage(
        'Heartbeat',
        station,
        wsClient.getMessageIdForCall(),
      );
      wsClient.send(message);
    }, 60000);

    // for later, ping the server if heartbeat is more than 5 mins
  };

  public onMessage = (wsClient: StationWebSocketClient, _: Station, data: string) => {
    let parsedMessage: any;
    parsedMessage = JSON.parse(data);

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
        if (reqId.toString() === wsClient.getLastMessageId().toString()) {
          this.logger.log(`Received response for reqId ${wsClient.getLastMessageId()}: ${JSON.stringify(payload)}`);
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

  public onConnectionClosed = (wsClient: StationWebSocketClient, station: Station, code: number, reason: string) => {
    clearInterval(wsClient.heartbeatInterval);

    const connectedDurationInSeconds = (new Date().getTime() - wsClient.connectedTime.getTime()) / 1000;
    const connectedMinutes = Math.floor(connectedDurationInSeconds / 60);
    const extraConnectedSeconds = connectedDurationInSeconds % 60;
    this.logger.log(`Duration of the connection: ${connectedMinutes} minutes & ${extraConnectedSeconds} seconds.
Closing connection ${station.identity}. Code: ${code}. Reason: ${reason}.`);
  };
}
