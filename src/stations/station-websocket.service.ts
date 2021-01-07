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
import { RemoteStartTransactionRequest } from '../models/RemoteStartTransactionRequest';
import { RemoteStopTransactionRequest } from '../models/RemoteStopTransactionRequest';
import { RemoteStartTransactionResponse } from '../models/RemoteStartTransactionResponse';
import { RemoteStopTransactionResponse } from '../models/RemoteStopTransactionResponse';
import { RemoteStartStopStatusEnum } from '../models/RemoteStartStopStatusEnum';

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
    this.sendMessageToCS(wsClient, bootMessage, 'BootNotification');

    this.createHeartbeatInterval(wsClient, station);

    if (station.chargeInProgress) {
      this.createMeterValueInterval(wsClient, station);
    }

    // TODO: ping the server if heartbeat is more than 5 mins
  };

  private createHeartbeatInterval(wsClient: StationWebSocketClient, station: Station) {
    wsClient.heartbeatInterval = setInterval(() => {
      // do not send heartbeat if meterValue is being sent
      if (wsClient.meterValueInterval) return;

      const heartbeatMessage = this.byChargePointOperationMessageGenerator.createMessage(
        'Heartbeat',
        station,
        wsClient.getMessageIdForCall(),
      );
      this.sendMessageToCS(wsClient, heartbeatMessage, 'Heartbeat');
    }, 60000);
  }

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
      this.sendMessageToCS(wsClient, message, 'MeterValues');
    }, 60000);
  }

  public onMessage = (wsClient: StationWebSocketClient, station: Station, data: string) => {
    let parsedMessage: any;
    parsedMessage = JSON.parse(data);

    const messageType = parsedMessage[0] as ChargePointMessageTypes;
    switch (messageType) {
      case ChargePointMessageTypes.Call: {
        this.processCallMsgFromCS(wsClient, station, data);
        break;
      }
      case ChargePointMessageTypes.CallResult: {
        this.processCallResultMsgFromCS(wsClient, station, data);
        break;
      }
      default:
        this.logger.log('data does not have correct messageTypeId', data);
    }
  };

  public onError(err: Error) {
    this.logger.error(`Error: ${err?.message ?? ''}`, err.stack ?? '');
  }

  public onConnectionClosed = (wsClient: StationWebSocketClient, station: Station, code: number, reason: string) => {
    clearInterval(wsClient.heartbeatInterval);
    clearInterval(wsClient.meterValueInterval);

    if (wsClient?.connectedTime) {
      const connectedDurationInSeconds = (new Date().getTime() - wsClient.connectedTime.getTime()) / 1000;
      const connectedMinutes = Math.floor(connectedDurationInSeconds / 60);
      const extraConnectedSeconds = connectedDurationInSeconds % 60;
      this.logger.log(`Duration of the connection: ${connectedMinutes} minutes & ${extraConnectedSeconds} seconds.
Closing connection ${station.identity}. Code: ${code}. Reason: ${reason}.`);
    }
  };

  private async updateStationMeterValue(station: Station, operationName: string) {
    if (operationName === 'StopTransaction') {
      const dto = new CreateOrUpdateStationDto();
      dto.meterValue = station.meterValue + calculatePowerUsageInWh(station.updatedAt, station.currentChargingPower);
      this.stationRepository.updateStation(station, dto);
    }
  }

  public async prepareAndSendMessageToCentralSystem(
    wsClient: StationWebSocketClient,
    station: Station,
    operationName: string,
    payload: StationOperationDto,
  ) {
    await this.updateStationMeterValue(station, operationName);

    const message = this.byChargePointOperationMessageGenerator.createMessage(
      operationName,
      station,
      wsClient.getMessageIdForCall(),
      payload,
    );

    if (!message) {
      throw new BadRequestException(`Cannot form message for operation ${operationName}`);
    }

    this.sendMessageToCS(wsClient, message, operationName);
    wsClient.expectingCallResult = true;

    const response = await this.waitForMessage(wsClient);

    wsClient.callResultMessageFromCS = null;
    wsClient.expectingCallResult = false;

    return { request: message, response };
  }

  private sendMessageToCS(wsClient: StationWebSocketClient, message: string, operationName: string) {
    wsClient.callMessageOperationFromStation = operationName;
    this.logger.verbose(`Sending message for station ${wsClient.stationIdentity}: ${message}`);
    wsClient.send(message);
  }

  public waitForMessage = (wsClient: StationWebSocketClient): Promise<string | null> => {
    return new Promise<string | null>(resolve => {
      const maxNumberOfAttemps = 50;
      const intervalTime = 200;

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
        this.logger.debug('Message not yet received, checking for more');
        currentAttemp++;
      }, intervalTime);
    });
  };

  public async processCallMsgFromCS(
    wsClient: StationWebSocketClient,
    station: Station,
    request: string,
  ): Promise<void> {
    this.logger.log('Processing request from CS', request);
    try {
      const parsedMessage = JSON.parse(request);
      const [, uniqueId, action, payload] = parsedMessage as [number, string, string, object];
      switch (action.toLowerCase()) {
        case 'remotestarttransaction': {
          const { idTag } = payload as RemoteStartTransactionRequest;
          const responseMessage = this.buildCallResultToCSMessage(
            station,
            { status: RemoteStartStopStatusEnum.Accepted },
            uniqueId,
            action,
          );
          this.sendMessageToCS(wsClient, responseMessage, '');
          this.prepareAndSendMessageToCentralSystem(wsClient, station, 'StartTransaction', { idTag });
          break;
        }
        case 'remotestoptransaction': {
          await station.reload();
          const { transactionId } = payload as RemoteStopTransactionRequest;
          let status = RemoteStartStopStatusEnum.Accepted;
          if (station.currentTransactionId !== transactionId) {
            this.logger.error(
              `Different transaction_ID received: ${transactionId}. Current transactionId: ${station.currentTransactionId}`,
            );
            status = RemoteStartStopStatusEnum.Rejected;
          }
          const responseMessage = this.buildCallResultToCSMessage(station, { status }, uniqueId, action);
          this.sendMessageToCS(wsClient, responseMessage, '');

          if (status === RemoteStartStopStatusEnum.Accepted) {
            this.prepareAndSendMessageToCentralSystem(wsClient, station, 'StopTransaction', {});
          }
          break;
        }
        case 'reset': {
          const responseMessage = this.buildCallResultToCSMessage(station, { status: 'Accepted' }, uniqueId, action);
          this.sendMessageToCS(wsClient, responseMessage, '');
          station.chargeInProgress = false;
          station.currentTransactionId = null;
          await station.save();
          wsClient.close(1012, 'Reset requested by Central System');
          break;
        }
      }
    } catch (error) {
      this.logger.error(`Error processing request from CS`, error.stack ?? '', error.message ?? '');
    }
  }

  private buildCallResultToCSMessage(station: Station, payload: any, uniqueId: string, operationName: string): string {
    let responsePayload: any = {};
    switch (operationName.toLowerCase()) {
      case 'remotestarttransaction': {
        responsePayload = new RemoteStartTransactionResponse();
        responsePayload.status = payload.status;
        break;
      }
      case 'remotestoptransaction': {
        responsePayload = new RemoteStopTransactionResponse();
        responsePayload.status = payload.status;
        break;
      }
      case 'reset': {
        responsePayload.status = 'Accepted';
        break;
      }
    }
    const responseMessage = JSON.stringify([ChargePointMessageTypes.CallResult, uniqueId, responsePayload]);
    this.logger.debug(`Send response message back to CS: ${responseMessage}`);
    return responseMessage;
  }

  public processCallResultMsgFromCS(wsClient: StationWebSocketClient, station: Station, response: string) {
    try {
      const parsedMessage = JSON.parse(response);
      const [, reqId, payload] = parsedMessage as [number, string, object];
      if (reqId.toString() !== wsClient.lastMessageId.toString()) return;
      this.logger.verbose(`Received response for reqId ${wsClient.lastMessageId}: ${response}`);

      switch (wsClient.callMessageOperationFromStation.toLowerCase()) {
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
            wsClient.meterValueInterval = null;
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

            // TODO: add more status + add a bit delay here
            this.sendMessageToCS(wsClient, availableStatusNotificationMessage, 'StatusNotification');
          }
          break;
        }

        default:
      }

      wsClient.callResultMessageFromCS = wsClient.expectingCallResult ? response : null;
    } catch (error) {
      this.logger.error(`Error processing response`, error.stack ?? '', error.message ?? '');
    } finally {
      wsClient.callMessageOperationFromStation = '';
    }
  }
}
