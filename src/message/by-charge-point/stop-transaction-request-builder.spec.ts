import { Test } from '@nestjs/testing';
import { Station } from '../../stations/station.entity';
import { StopTransactionRequestBuilder } from './stop-transaction-request-builder';

describe('StopTransactionRequestBuilder', () => {
  let stopTransactionRequestBuilder: StopTransactionRequestBuilder;
  let station: Station;

  beforeEach(async () => {
    const testModule = await Test.createTestingModule({
      providers: [StopTransactionRequestBuilder],
    }).compile();

    station = new Station();
    station.meterValue = 200;
    station.currentTransactionId = 10;

    stopTransactionRequestBuilder = testModule.get<StopTransactionRequestBuilder>(StopTransactionRequestBuilder);
  });
  it('test build with data from payload', () => {
    const payload = {
      transactionId: 10,
      transactionData: 'testTransactionData',
    };
    const request = stopTransactionRequestBuilder.build(station, payload);

    expect(request.transactionId).toEqual(payload.transactionId);
    expect(request.timestamp).not.toBeNull();
    expect(request.transactionData).toEqual(payload.transactionData);
    expect(request.meterStop).toEqual(station.meterValue);
  });

  it('test build with data from station if payload does not have transactionId', () => {
    const payload = {};
    const request = stopTransactionRequestBuilder.build(station, payload);

    expect(request.transactionId).toEqual(station.currentTransactionId);
    expect(request.timestamp).not.toBeNull();
    expect(request.meterStop).toEqual(station.meterValue);
  });

  test('getOperationName method', () => {
    expect(stopTransactionRequestBuilder.getOperationName()).toStrictEqual('StopTransaction');
  });
});
