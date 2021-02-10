import { Injectable } from '@nestjs/common';
import { OperationNameFromChargePoint } from '../../../models/OperationNameFromChargePoint';
import { CallResultMsgHandlerInterface } from './call-result-msg-handler-interface';
import { StartTransactionResultMsgHandler } from './start-transaction-result-msg-handler';
import { StopTransactionResultMsgHandler } from './stop-transaction-result-msg-handler';

@Injectable()
export class CallResultMsgHandlerFactory {
  public constructor(
    private startTransactionResultMsgHandler: StartTransactionResultMsgHandler,
    private stopTransactionResultMsgHandler: StopTransactionResultMsgHandler,
  ) {}

  getHandler(operationName: string): CallResultMsgHandlerInterface | null {
    switch (operationName.toLowerCase()) {
      case OperationNameFromChargePoint.StartTransaction.toLowerCase(): {
        return this.startTransactionResultMsgHandler;
      }
      case OperationNameFromChargePoint.StopTransaction.toLowerCase(): {
        return this.stopTransactionResultMsgHandler;
      }
      default:
        return null;
    }
  }
}
