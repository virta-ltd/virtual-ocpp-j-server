import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ByChargePointOperationMessageGenerator } from '../../../message/by-charge-point/by-charge-point-operation-message-generator';
import { CallResultMessage } from '../../../models/CallResultMessage';
import { IdTagInfoStatusEnum } from '../../../models/IdTagInfoStatusEnum';
import { OperationNameFromChargePoint } from '../../../models/OperationNameFromChargePoint';
import { StopTransactionResponse } from '../../../models/StopTransactionResponse';
import { CreateOrUpdateStationDto } from '../../dto/create-update-station.dto';
import { StationWebSocketClient } from '../../station-websocket-client';
import { Station } from '../../station.entity';
import { StationRepository } from '../../station.repository';
import { CallResultMsgHandlerInterface } from './call-result-msg-handler-interface';

export class StopTransactionResultMsgHandler implements CallResultMsgHandlerInterface {
  private logger = new Logger(StopTransactionResultMsgHandler.name);
  public constructor(
    @InjectRepository(StationRepository)
    private stationRepository: StationRepository,
    private byChargePointOperationMessageGenerator: ByChargePointOperationMessageGenerator,
  ) {}

  handle(wsClient: StationWebSocketClient, station: Station, parsedMessage: CallResultMessage): void | Promise<void> {
    const payload = parsedMessage[2];
    const {
      idTagInfo: { status },
    } = payload as StopTransactionResponse;

    if (status !== IdTagInfoStatusEnum.Accepted) {
      this.logger.log(`StopTransaction not accepted for ${wsClient.stationIdentity}`);
      return;
    }

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

    // TODO: add more statuses (finishing, finished)
    setTimeout(() => {
      wsClient.sendCallMsgForOperation(
        availableStatusNotificationMessage,
        OperationNameFromChargePoint.StatusNotification,
      );
    }, 1000);
  }
}
