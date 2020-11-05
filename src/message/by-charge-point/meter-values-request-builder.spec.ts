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
    const meterValue = request.metervalue[0];
    expect(meterValue).not.toBeNull();
    expect(meterValue.sampledValue.value).toEqual(station.meterValue);
    expect(meterValue.sampledValue.context).toEqual(ReadingContext.SamplePeriodic);
    expect(meterValue.sampledValue.measureand).toEqual(Measurand.EnergyActiveImportRegister);
    expect(meterValue.sampledValue.unit).toEqual(UnitOfMeasure.Wh);
    expect(meterValue.sampledValue.location).toEqual(Location.Outlet);
    expect(request.connectorId).toBe(1);
    expect(request.transactionId).toBeUndefined();
  });

  it('builds value from payload & station', () => {
    const payload = {
      value: 200,
      context: ReadingContext.SampleClock,
      measureand: Measurand.EnergyReactiveExportInterval,
      unit: UnitOfMeasure.kWh,
      location: Location.Inlet,
    };
    station.currentTransactionId = 20;
    const request = meterValuesRequestBuilder.build(station, payload);
    const meterValue = request.metervalue[0];
    expect(meterValue).not.toBeNull();
    expect(meterValue.sampledValue.value).toEqual(payload.value);
    expect(meterValue.sampledValue.context).toEqual(payload.context);
    expect(meterValue.sampledValue.measureand).toEqual(payload.measureand);
    expect(meterValue.sampledValue.unit).toEqual(payload.unit);
    expect(meterValue.sampledValue.location).toEqual(payload.location);
    expect(request.transactionId).toBe(20);
  });

  test('getOperationName method', () => {
    expect(meterValuesRequestBuilder.getOperationName()).toStrictEqual('MeterValues');
  });
});
