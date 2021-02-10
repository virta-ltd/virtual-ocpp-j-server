import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ByChargePointOperationMessageGenerator } from '../message/by-charge-point/by-charge-point-operation-message-generator';
import { ChargePointMessageTypes } from '../models/ChargePointMessageTypes';
import { CreateOrUpdateStationDto } from './dto/create-update-station.dto';
import { StationOperationDto } from './dto/station-operation-dto';
import { StationWebSocketClient } from './station-websocket-client';
import { Station } from './station.entity';
import { StationRepository } from './station.repository';
import { calculatePowerUsageInWh } from './utils';
import { CallMsgHandlerFactory } from './handler/call-msg/call-msg-handler-factory';
import { OperationNameFromCentralSystem } from '../models/OperationNameFromCentralSystem';
import { CallResultMsgHandlerFactory } from './handler/call-result-msg/call-result-msg-handler-factory';

@Injectable()
export class StationWebSocketService {
  private logger = new Logger(StationWebSocketService.name);
  constructor(
    @InjectRepository(StationRepository)
    private stationRepository: StationRepository,
    private byChargePointOperationMessageGenerator: ByChargePointOperationMessageGenerator,
    private callMsgHandlerFactory: CallMsgHandlerFactory,
    private callResultMsgHandlerFactory: CallResultMsgHandlerFactory,
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
    try {
      parsedMessage = JSON.parse(data);
    } catch (error) {
      this.logger.error(`Error parsing message: ${data}`);
      return;
    }

    const messageType = parsedMessage[0] as ChargePointMessageTypes;

    switch (messageType) {
      case ChargePointMessageTypes.Call: {
        const operationName = parsedMessage[2] as OperationNameFromCentralSystem;
        this.logger.log(
          `Received Call message (identity: ${station.identity}) for operation ${operationName}: ${data}`,
        );
        const msgHandler = this.callMsgHandlerFactory.getHandler(operationName);
        msgHandler?.handle(wsClient, station, data);
        break;
      }

      case ChargePointMessageTypes.CallResult: {
        const [, reqId] = parsedMessage as [number, string, object];

        this.logger.log(
          `Received CallResult message (identity: ${station.identity}) for operation ${wsClient.callMessageOperationFromStation}: ${data}`,
        );

        if (!wsClient.isLastMessageIdSimilar(reqId)) {
          this.logger.error(
            `Received incorrect reqId. wsClient.lastMessageId: ${wsClient.lastMessageId}. Received message: ${data}`,
            null,
            `Identity ${station.identity}`,
          );
          return;
        }

        const msgHandler = this.callResultMsgHandlerFactory.getHandler(wsClient.callMessageOperationFromStation);
        msgHandler?.handle(wsClient, station, parsedMessage);

        wsClient.callResultMessageFromCS = wsClient.expectingCallResult ? data : null;
        wsClient.callMessageOperationFromStation = '';

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
      this.logger.log(
        `Duration of the connection: ${connectedMinutes} minutes & ${extraConnectedSeconds} seconds. Closing connection ${station.identity}. Code: ${code}. Reason: ${reason}.`,
      );
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
}
