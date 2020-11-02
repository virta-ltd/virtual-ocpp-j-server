import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ByChargePointOperationMessageFactory } from '../message/by-charge-point/by-charge-point-operation-message-factory';
import { ChargePointMessageTypes } from '../models/ChargePointMessageTypes';
import { StationOperationDto } from './dto/station-operation-dto';
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

    // TODO: ping the server if heartbeat is more than 5 mins
  };

  public onMessage = (wsClient: StationWebSocketClient, _: Station, data: string) => {
    this.logger.log('Received message', data);
    let parsedMessage: any;
    parsedMessage = JSON.parse(data);

    const messageType = parsedMessage[0] as ChargePointMessageTypes;
    switch (messageType) {
      case ChargePointMessageTypes.Call: {
        // remoteStart, remoteStop
        const [, uniqueId, action, payload] = parsedMessage as [number, string, string, object];
        this.logger.log(parsedMessage);
        wsClient.callMessageFromCS = parsedMessage;
        break;
      }
      case ChargePointMessageTypes.CallResult: {
        this.processCallResultMessage(wsClient, parsedMessage);
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

    if (wsClient?.connectedTime) {
      const connectedDurationInSeconds = (new Date().getTime() - wsClient.connectedTime.getTime()) / 1000;
      const connectedMinutes = Math.floor(connectedDurationInSeconds / 60);
      const extraConnectedSeconds = connectedDurationInSeconds % 60;
      this.logger.log(`Duration of the connection: ${connectedMinutes} minutes & ${extraConnectedSeconds} seconds.
Closing connection ${station.identity}. Code: ${code}. Reason: ${reason}.`);
    }
  };

  public async sendMessageToCentralSystem(
    wsClient: StationWebSocketClient,
    station: Station,
    operationName: string,
    payload: StationOperationDto,
  ) {
    this.logger.log('current messageid' + wsClient.getLastMessageId());
    const message = this.byChargePointOperationMessageFactory.createMessage(
      operationName,
      station,
      wsClient.getMessageIdForCall(),
      payload,
    );

    if (!message) {
      throw new BadRequestException(`Cannot form message for operation ${operationName}`);
    }

    wsClient.send(message);
    wsClient.expectingCallResult = true;

    const response = await this.waitForMessage(wsClient);
    wsClient.callResultMessageFromCS = null;
    wsClient.expectingCallResult = false;

    return { request: message, response };
  }

  public waitForMessage = (wsClient: StationWebSocketClient): Promise<string | null> => {
    return new Promise<string | null>(resolve => {
      const maxNumberOfAttemps = 100;
      const intervalTime = 100; // can reduced to even 1, need to think how much time we want to loop for answers

      let currentAttemp = 0;

      const interval = setInterval(() => {
        if (currentAttemp > maxNumberOfAttemps - 1) {
          clearInterval(interval);
          this.logger.log('Server does not respond');
          return resolve(null);
        } else if (wsClient.callResultMessageFromCS) {
          clearInterval(interval);
          return resolve(wsClient.callResultMessageFromCS);
        }
        this.logger.log('Message not yet received, checking for more');
        currentAttemp++;
      }, intervalTime);
    });
  };

  private processCallResultMessage(wsClient: StationWebSocketClient, parsedMessage: any) {
    const [, reqId, payload] = parsedMessage as [number, string, object];
    if (reqId.toString() !== wsClient.getLastMessageId().toString()) return;

    this.logger.log(`Received response for reqId ${wsClient.getLastMessageId()}: ${JSON.stringify(payload)}`);

    if (wsClient.expectingCallResult) {
      wsClient.callResultMessageFromCS = JSON.stringify(parsedMessage);
    }
  }
}
