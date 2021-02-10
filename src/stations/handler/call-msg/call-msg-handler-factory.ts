import { Injectable } from '@nestjs/common';
import { OperationNameFromCentralSystem } from '../../../models/OperationNameFromCentralSystem';
import { CallMsgHandlerInterface } from './call-msg-handler-interface';
import { RemoteStartTransactionMsgHandler } from './remote-start-transaction-msg-handler';
import { RemoteStopTransactionMsgHandler } from './remote-stop-transaction-msg-handler';
import { ResetMsgHandler } from './reset-msg-handler';

@Injectable()
export class CallMsgHandlerFactory {
  public constructor(
    private remoteStartTransactionMsgHandler: RemoteStartTransactionMsgHandler,
    private remoteStopTransactionMsgHandler: RemoteStopTransactionMsgHandler,
    private resetMsgHandler: ResetMsgHandler,
  ) {}

  getHandler(operationName: OperationNameFromCentralSystem): CallMsgHandlerInterface | null {
    switch (operationName.toLowerCase()) {
      case OperationNameFromCentralSystem.RemoteStartTransaction.toLowerCase(): {
        return this.remoteStartTransactionMsgHandler;
      }
      case OperationNameFromCentralSystem.RemoteStopTransaction.toLowerCase(): {
        return this.remoteStopTransactionMsgHandler;
      }
      case OperationNameFromCentralSystem.Reset.toLowerCase(): {
        return this.resetMsgHandler;
      }
      default:
        return null;
    }
  }
}
