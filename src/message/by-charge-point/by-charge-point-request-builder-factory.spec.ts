import { Test } from '@nestjs/testing';
import { AuthorizeRequestBuilder } from './authorize-request-builder';
import { BootNotificationRequestBuilder } from './boot-notification-request-builder';
import { ByChargePointRequestBuilderFactory } from './by-charge-point-request-builder-factory';
import { HeartbeatRequestBuilder } from './heartbeat-request-builder';
import { MeterValuesRequestBuilder } from './meter-values-request-builder';
import { StartTransactionRequestBuilder } from './start-transaction-request-builder';
import { StatusNotificationRequestBuilder } from './status-notification-request-builder';
import { StopTransactionRequestBuilder } from './stop-transaction-request-builder';

describe('ByChargePointRequestBuilderFactory', () => {
  let byChargePointRequestBuilderFactory: ByChargePointRequestBuilderFactory;
  beforeEach(async () => {
    const testModule = await Test.createTestingModule({
      providers: [
        AuthorizeRequestBuilder,
        BootNotificationRequestBuilder,
        HeartbeatRequestBuilder,
        MeterValuesRequestBuilder,
        StartTransactionRequestBuilder,
        StatusNotificationRequestBuilder,
        StopTransactionRequestBuilder,
        ByChargePointRequestBuilderFactory,
      ],
    }).compile();

    byChargePointRequestBuilderFactory = testModule.get<ByChargePointRequestBuilderFactory>(
      ByChargePointRequestBuilderFactory,
    );
  });

  test.each([
    ['authorize', 'Authorize'],
    ['bootnotification', 'BootNotification'],
    ['heartbeat', 'Heartbeat'],
    ['metervalues', 'MeterValues'],
    ['starttransaction', 'StartTransaction'],
    ['statusnotification', 'StatusNotification'],
    ['stoptransaction', 'StopTransaction'],
  ])('getBuilderFromOperationName for operation %s', (name: string, correctOperationName: string) => {
    expect(byChargePointRequestBuilderFactory.getBuilderFromOperationName(name).getOperationName()).toEqual(
      correctOperationName,
    );
  });

  it('returns null when operationName does not match', () => {
    expect(byChargePointRequestBuilderFactory.getBuilderFromOperationName('randomName')).toBeNull();
  });
});
