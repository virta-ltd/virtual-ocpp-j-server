import { Test, TestingModule } from '@nestjs/testing';
import { ByChargePointOperationMessageGenerator } from '../../../message/by-charge-point/by-charge-point-operation-message-generator';
import { OperationNameFromCentralSystem } from '../../../models/OperationNameFromCentralSystem';
import { StationRepository } from '../../station.repository';
import { CallMsgHandlerFactory } from './call-msg-handler-factory';
import { RemoteStartTransactionMsgHandler } from './remote-start-transaction-msg-handler';
import { RemoteStopTransactionMsgHandler } from './remote-stop-transaction-msg-handler';
import { ResetMsgHandler } from './reset-msg-handler';

describe('CallMsgHandlerFactory', () => {
  let msgHandlerfactory: CallMsgHandlerFactory;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: StationRepository,
          useValue: {},
        },
        {
          provide: ByChargePointOperationMessageGenerator,
          useValue: {},
        },
        CallMsgHandlerFactory,
        RemoteStartTransactionMsgHandler,
        RemoteStopTransactionMsgHandler,
        ResetMsgHandler,
      ],
    }).compile();

    msgHandlerfactory = module.get<CallMsgHandlerFactory>(CallMsgHandlerFactory);
  });

  it('unknown handler, null returned', () => {
    expect(msgHandlerfactory.getHandler(OperationNameFromCentralSystem.Unknown)).toBeNull();
  });

  it.each([
    [OperationNameFromCentralSystem.RemoteStartTransaction, RemoteStartTransactionMsgHandler],
    [OperationNameFromCentralSystem.RemoteStopTransaction, RemoteStopTransactionMsgHandler],
    [OperationNameFromCentralSystem.Reset, ResetMsgHandler],
  ])('Tesing CallMsgHandlerFactory operationName %s', (operationName: OperationNameFromCentralSystem, handlerName) => {
    expect(msgHandlerfactory.getHandler(operationName)).toBeInstanceOf(handlerName);
  });
});
