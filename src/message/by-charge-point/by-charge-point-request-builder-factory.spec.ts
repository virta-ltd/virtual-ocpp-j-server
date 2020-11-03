import { Test } from '@nestjs/testing';
import { BootNotificationRequestBuilder } from './boot-notification-request-builder';
import { ByChargePointRequestBuilderFactory } from './by-charge-point-request-builder-factory';
import { HeartbeatRequestBuilder } from './heartbeat-request-builder';

describe('ByChargePointRequestBuilderFactory', () => {
  let byChargePointRequestBuilderFactory: ByChargePointRequestBuilderFactory;
  beforeEach(async () => {
    const testModule = await Test.createTestingModule({
      providers: [HeartbeatRequestBuilder, BootNotificationRequestBuilder, ByChargePointRequestBuilderFactory],
    }).compile();

    byChargePointRequestBuilderFactory = testModule.get<ByChargePointRequestBuilderFactory>(
      ByChargePointRequestBuilderFactory,
    );
  });

  test.each([
    ['bootnotification', 'BootNotification'],
    ['heartbeat', 'Heartbeat'],
  ])('getBuilderFromOperationName for operation %s', (name: string, correctOperationName: string) => {
    expect(byChargePointRequestBuilderFactory.getBuilderFromOperationName(name).getOperationName()).toEqual(
      correctOperationName,
    );
  });

  it('returns null when operationName does not match', () => {
    expect(byChargePointRequestBuilderFactory.getBuilderFromOperationName('randomName')).toBeNull();
  });
});
