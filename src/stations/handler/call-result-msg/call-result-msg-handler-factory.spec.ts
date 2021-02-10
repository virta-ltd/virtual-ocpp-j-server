import { Test, TestingModule } from '@nestjs/testing';
import { ByChargePointOperationMessageGenerator } from '../../../message/by-charge-point/by-charge-point-operation-message-generator';
import { OperationNameFromChargePoint } from '../../../models/OperationNameFromChargePoint';
import { StationRepository } from '../../station.repository';
import { CallResultMsgHandlerFactory } from './call-result-msg-handler-factory';
import { StartTransactionResultMsgHandler } from './start-transaction-result-msg-handler';
import { StopTransactionResultMsgHandler } from './stop-transaction-result-msg-handler';

describe('CallResultMsgHandlerFactory', () => {
  let msgHandlerfactory: CallResultMsgHandlerFactory;
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
        CallResultMsgHandlerFactory,
        StopTransactionResultMsgHandler,
        StartTransactionResultMsgHandler,
      ],
    }).compile();

    msgHandlerfactory = module.get<CallResultMsgHandlerFactory>(CallResultMsgHandlerFactory);
  });

  test('unknown handler, null returned', () => {
    expect(msgHandlerfactory.getHandler(OperationNameFromChargePoint.Unknown)).toBeNull();
  });

  test.each([
    [OperationNameFromChargePoint.StartTransaction, StartTransactionResultMsgHandler],
    [OperationNameFromChargePoint.StopTransaction, StopTransactionResultMsgHandler],
  ])(
    'Tesing CallResultMsgHandlerFactory operationName %s',
    (operationName: OperationNameFromChargePoint, handlerName) => {
      expect(msgHandlerfactory.getHandler(operationName)).toBeInstanceOf(handlerName);
    },
  );
});
