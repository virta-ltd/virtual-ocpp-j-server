import { Test } from '@nestjs/testing';
import { StatusNotificationRequest } from 'src/models/StatusNotificationRequest';
import { StatusNotificationErrorCodeEnum } from '../../models/StatusNotificationErrorCodeEnum';
import { StatusNotificationStatusEnum } from '../../models/StatusNotificationStatusEnum';
import { Station } from '../../stations/station.entity';
import { StatusNotificationRequestBuilder } from './status-notification-request-builder';

describe('StatusNotificationRequestBuilder', () => {
  let statusNotificationRequestBuilder: StatusNotificationRequestBuilder;
  let station: Station;

  beforeEach(async () => {
    const testModule = await Test.createTestingModule({
      providers: [StatusNotificationRequestBuilder],
    }).compile();

    station = new Station();
    station.meterValue = 100;

    statusNotificationRequestBuilder = testModule.get<StatusNotificationRequestBuilder>(
      StatusNotificationRequestBuilder,
    );
  });

  it('test build with no payload', () => {
    const payload = {};
    const request = statusNotificationRequestBuilder.build(station, payload);

    expect(request.timestamp).not.toBeNull();
    expect(request.status).toEqual(StatusNotificationStatusEnum.Available);
    expect(request.errorCode).toEqual(StatusNotificationErrorCodeEnum.NoError);
  });

  it('test build with payload', () => {
    const payload = {
      status: StatusNotificationStatusEnum.Unavailable,
      errorCode: StatusNotificationErrorCodeEnum.OtherError,
    };
    const request = statusNotificationRequestBuilder.build(station, payload);

    expect(request.timestamp).not.toBeNull();
    expect(request.status).toEqual(payload.status);
    expect(request.errorCode).toEqual(payload.errorCode);
  });

  test('getOperationName method', () => {
    expect(statusNotificationRequestBuilder.getOperationName()).toStrictEqual('StatusNotification');
  });
});
