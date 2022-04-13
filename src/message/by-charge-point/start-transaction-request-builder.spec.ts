import { Test } from '@nestjs/testing';
import { Station } from '../../stations/station.entity';
import { StartTransactionRequestBuilder } from './start-transaction-request-builder';

describe('StartTransactionRequestBuilder', () => {
  let startTransactionRequestBuilder: StartTransactionRequestBuilder;
  let station: Station;

  beforeEach(async () => {
    const testModule = await Test.createTestingModule({
      providers: [StartTransactionRequestBuilder],
    }).compile();

    station = new Station();
    station.meterValue = 100;

    startTransactionRequestBuilder = testModule.get<StartTransactionRequestBuilder>(StartTransactionRequestBuilder);
  });
  it('test build with data from payload', () => {
    const payload = {
      idTag: 'ABCD',
    };
    const request = startTransactionRequestBuilder.build(station, payload);

    expect(request.idTag).toEqual(payload.idTag);
    expect(request.connectorId).toEqual(1);
    expect(request.timestamp).not.toBeNull();
    expect(request.meterStart).toEqual(station.meterValue);
  });

  it('test build with custom timestamp in payload', () => {
    const payload = {
      idTag: 'ABCD',
      timestamp: '2022-04-13T07:59:14.925Z'
    };
    const request = startTransactionRequestBuilder.build(station, payload);

    expect(request.idTag).toEqual(payload.idTag);
    expect(request.connectorId).toEqual(1);
    expect(request.timestamp).toStrictEqual(payload.timestamp)
    expect(request.meterStart).toEqual(station.meterValue);
  });

  test('getOperationName method', () => {
    expect(startTransactionRequestBuilder.getOperationName()).toStrictEqual('StartTransaction');
  });
});
