import { Test } from '@nestjs/testing';
import { Location, Measurand, ReadingContext, UnitOfMeasure } from '../../models/SampledValue';
import { Station } from '../../stations/station.entity';
import { MeterValuesRequestBuilder } from './meter-values-request-builder';

describe('MeterValuesRequestBuilder', () => {
  let meterValuesRequestBuilder: MeterValuesRequestBuilder;
  let station: Station;

  beforeEach(async () => {
    const testModule = await Test.createTestingModule({
      providers: [MeterValuesRequestBuilder],
    }).compile();

    station = new Station();
    station.meterValue = 100;

    meterValuesRequestBuilder = testModule.get<MeterValuesRequestBuilder>(MeterValuesRequestBuilder);
  });

  it('builds default value', () => {
    const request = meterValuesRequestBuilder.build(station, {});
    const meterValue = request.meterValue[0];
    expect(meterValue).not.toBeNull();
    expect(meterValue.timestamp).not.toBeUndefined();
    expect(meterValue.sampledValue[0].value).toEqual(station.meterValue);
    expect(meterValue.sampledValue[0].context).toEqual(ReadingContext.SamplePeriodic);
    expect(meterValue.sampledValue[0].measurand).toEqual(Measurand.EnergyActiveImportRegister);
    expect(meterValue.sampledValue[0].unit).toEqual(UnitOfMeasure.Wh);
    expect(meterValue.sampledValue[0].location).toEqual(Location.Outlet);
    expect(request.connectorId).toBe(1);
    expect(request.transactionId).toBeUndefined();
  });

  it('builds value from payload & station', () => {
    const payload = {
      value: 200,
      context: ReadingContext.SampleClock,
      measurand: Measurand.EnergyReactiveExportInterval,
      unit: UnitOfMeasure.kWh,
      location: Location.Inlet,
    };
    station.currentTransactionId = 20;
    const request = meterValuesRequestBuilder.build(station, payload);
    const meterValue = request.meterValue[0];
    expect(meterValue).not.toBeNull();
    expect(meterValue.timestamp).not.toBeUndefined();
    expect(meterValue.sampledValue[0].value).toEqual(payload.value);
    expect(meterValue.sampledValue[0].context).toEqual(payload.context);
    expect(meterValue.sampledValue[0].measurand).toEqual(payload.measurand);
    expect(meterValue.sampledValue[0].unit).toEqual(payload.unit);
    expect(meterValue.sampledValue[0].location).toEqual(payload.location);
    expect(request.transactionId).toBe(20);
  });

  test('getOperationName method', () => {
    expect(meterValuesRequestBuilder.getOperationName()).toStrictEqual('MeterValues');
  });
});
