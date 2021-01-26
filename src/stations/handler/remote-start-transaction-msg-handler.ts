import { Injectable, Logger } from '@nestjs/common';
import { ByChargePointOperationMessageGenerator } from '../../message/by-charge-point/by-charge-point-operation-message-generator';
import { ByChargePointOperationNameEnum } from '../../message/by-charge-point/by-charge-point-operation-name-enum';
import { ChargePointMessageTypes } from '../../models/ChargePointMessageTypes';
import { RemoteStartStopStatusEnum } from '../../models/RemoteStartStopStatusEnum';
import { RemoteStartTransactionRequest } from '../../models/RemoteStartTransactionRequest';
import { RemoteStartTransactionResponse } from '../../models/RemoteStartTransactionResponse';
import { StationWebSocketClient } from '../station-websocket-client';
import { Station } from '../station.entity';
import { CallMsgHandlerInterface } from './call-msg-handler-interface';

@Injectable()
export class RemoteStartTransactionMsgHandler implements CallMsgHandlerInterface {
  private logger = new Logger(RemoteStartTransactionMsgHandler.name);
  public constructor(private byChargePointOperationMessageGenerator: ByChargePointOperationMessageGenerator) {}

  public handle(wsClient: StationWebSocketClient, station: Station, requestFromCS: string): void {
    // parse message & build response
    const parsedMessage = JSON.parse(requestFromCS);
    const [, uniqueId, , payload] = parsedMessage as [number, string, string, object];
    const { idTag } = payload as RemoteStartTransactionRequest;
    const responseMessage = this.buildResponseMsg(uniqueId);

    // send response back to station
    this.logger.verbose(`Sending response for station ${wsClient.stationIdentity}: ${responseMessage}`);
    wsClient.send(responseMessage);

    // create new flow, send StartTransaction to station
    const startTransactionMsg = this.byChargePointOperationMessageGenerator.createMessage(
      ByChargePointOperationNameEnum.StartTransaction,
      station,
      wsClient.getMessageIdForCall(),
      { idTag },
    );

    this.logger.verbose(`Sending message for station ${wsClient.stationIdentity}: ${startTransactionMsg}`);
    wsClient.sendCallMsgForOperation(startTransactionMsg, ByChargePointOperationNameEnum.StartTransaction);
  }

  private buildResponseMsg(uniqueId: string): string {
    const payload = new RemoteStartTransactionResponse();
    payload.status = RemoteStartStopStatusEnum.Accepted; // later should check to reject if charger is in use?

    return JSON.stringify([ChargePointMessageTypes.CallResult, uniqueId, payload]);
  }
}
