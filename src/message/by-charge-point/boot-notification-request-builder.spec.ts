import { Test } from '@nestjs/testing';
import { Station } from '../../stations/station.entity';
import { BootNotificationRequestBuilder } from './boot-notification-request-builder';

describe('BootNotificationRequestBuilder', () => {
  let bootNotificationRequestBuilder: BootNotificationRequestBuilder;
  let station: Station;
  const vendor = 'Test_vendor';
  const model = 'Test_model';

  beforeEach(async () => {
    const testModule = await Test.createTestingModule({
      providers: [BootNotificationRequestBuilder],
    }).compile();

    station = new Station();
    station.vendor = vendor;
    station.model = model;

    bootNotificationRequestBuilder = testModule.get<BootNotificationRequestBuilder>(BootNotificationRequestBuilder);
  });
  it('test build with data from payload', () => {
    const payload = {
      vendor: 'payload_vendor',
      model: 'payload_model',
    };
    const request = bootNotificationRequestBuilder.build(station, payload);

    expect(request.chargePointModel).toEqual(payload.model);
    expect(request.chargePointVendor).toEqual(payload.vendor);
  });

  it('test build with data from staiton', () => {
    const request = bootNotificationRequestBuilder.build(station, undefined);

    expect(request.chargePointModel).toEqual(station.model);
    expect(request.chargePointVendor).toEqual(station.vendor);
  });

  test('getOperationName method', () => {
    const builder = new BootNotificationRequestBuilder();
    expect(builder.getOperationName()).toStrictEqual('BootNotification');
  });
});
