import { Injectable, Logger } from '@nestjs/common';
import { OperationNameFromCentralSystem } from '../../models/OperationNameFromCentralSystem';
import { CallMsgHandlerInterface } from './call-msg-handler-interface';
import { RemoteStartTransactionMsgHandler } from './remote-start-transaction-msg-handler';
import { RemoteStopTransactionMsgHandler } from './remote-stop-transaction-msg-handler';

@Injectable()
export class CallMsgHandlerFactory {
  private logger = new Logger(CallMsgHandlerFactory.name);
  public constructor(
    private remoteStartTransactionMsgHandler: RemoteStartTransactionMsgHandler,
    private remoteStopTransactionHandler: RemoteStopTransactionMsgHandler,
  ) {}

  getHandler(operationName: OperationNameFromCentralSystem): CallMsgHandlerInterface {
    this.logger.log('Operation name: ' + operationName);
    switch (operationName) {
      case OperationNameFromCentralSystem.RemoteStartTransaction: {
        return this.remoteStartTransactionMsgHandler;
      }
      case OperationNameFromCentralSystem.RemoteStopTransaction: {
        return this.remoteStopTransactionHandler;
      }
      case OperationNameFromCentralSystem.Reset:
        break;
      default:
    }
  }
}
