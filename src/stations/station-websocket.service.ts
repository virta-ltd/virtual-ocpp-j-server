import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StartTransactionResponse } from '../models/StartTransactionResponse';
import { ByChargePointOperationMessageGenerator } from '../message/by-charge-point/by-charge-point-operation-message-generator';
import { ChargePointMessageTypes } from '../models/ChargePointMessageTypes';
import { CreateOrUpdateStationDto } from './dto/create-update-station.dto';
import { StationOperationDto } from './dto/station-operation-dto';
import { StationWebSocketClient } from './station-websocket-client';
import { Station } from './station.entity';
import { StationRepository } from './station.repository';
import { IdTagInfoStatusEnum } from '../models/IdTagInfoStatusEnum';
import { StopTransactionResponse } from '../models/StopTransactionResponse';
import { calculatePowerUsageInWh } from './utils';

@Injectable()
export class StationWebSocketService {
  private logger = new Logger(StationWebSocketService.name);
  constructor(
    @InjectRepository(StationRepository)
    private stationRepository: StationRepository,
    private byChargePointOperationMessageGenerator: ByChargePointOperationMessageGenerator,
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

    const bootMessage = this.byChargePointOperationMessageGenerator.createMessage(
      'BootNotification',
      station,
      wsClient.getMessageIdForCall(),
    );
    wsClient.send(bootMessage);

    wsClient.heartbeatInterval = setInterval(() => {
      // do not send heartbeat if meterValue is being sent
      if (wsClient.meterValueInterval) return;

      const message = this.byChargePointOperationMessageGenerator.createMessage(
        'Heartbeat',
        station,
        wsClient.getMessageIdForCall(),
      );
      wsClient.send(message);
    }, 60000);

    if (station.chargeInProgress) {
      this.createMeterValueInterval(wsClient, station);
    }

    // TODO: ping the server if heartbeat is more than 5 mins
  };

  private createMeterValueInterval(wsClient: StationWebSocketClient, station: Station) {
    // clear any stuck interval
    clearInterval(wsClient.meterValueInterval);

    wsClient.meterValueInterval = setInterval(async () => {
      await station.reload();
      station.meterValue =
        station.meterValue + calculatePowerUsageInWh(station.updatedAt, station.currentChargingPower);
      await station.save();

      const message = this.byChargePointOperationMessageGenerator.createMessage(
        'MeterValues',
        station,
        wsClient.getMessageIdForCall(),
        { value: station.meterValue },
      );
      wsClient.send(message);
    }, 60000);
  }

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
    const message = this.byChargePointOperationMessageGenerator.createMessage(
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

    if (response) {
      this.processCallResultMsgFromCS(operationName, station, response, wsClient);
    }
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

  public processCallResultMsgFromCS(
    operationName: string,
    station: Station,
    response: string,
    wsClient: StationWebSocketClient,
  ) {
    try {
      const parsedMessage = JSON.parse(response);
      const [, , payload] = parsedMessage as [number, string, object];
      switch (operationName.toLowerCase()) {
        case 'starttransaction': {
          const {
            transactionId,
            idTagInfo: { status },
          } = payload as StartTransactionResponse;
          if (status === IdTagInfoStatusEnum.Accepted && transactionId > 0) {
            const dto: CreateOrUpdateStationDto = {
              chargeInProgress: true,
              currentTransactionId: transactionId,
            };
            this.stationRepository.updateStation(station, dto);
            this.createMeterValueInterval(wsClient, station);
          }
          break;
        }

        case 'stoptransaction': {
          const {
            idTagInfo: { status },
          } = payload as StopTransactionResponse;

          if (status === IdTagInfoStatusEnum.Accepted) {
            clearInterval(wsClient.meterValueInterval);
            const dto: CreateOrUpdateStationDto = {
              chargeInProgress: false,
              currentTransactionId: null,
            };
            this.stationRepository.updateStation(station, dto);

            const availableStatusNotificationMessage = this.byChargePointOperationMessageGenerator.createMessage(
              'StatusNotification',
              station,
              wsClient.getMessageIdForCall(),
              {},
            );
            wsClient.send(availableStatusNotificationMessage);
          }
          break;
        }

        default:
      }
    } catch (error) {
      this.logger.error(`Error processing response`, error.stack ?? '', error.message ?? '');
    }
  }
}
