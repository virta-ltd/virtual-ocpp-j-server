import { ByChargePointRequestBuilderInterface } from './by-charge-point-request-builder-interface';
import { Station } from '../../stations/station.entity';
import { MeterValuesRequest } from '../../models/MeterValuesRequest';
import { MeterValue } from '../../models/MeterValue';
import { Location, Measurand, ReadingContext, SampledValue, UnitOfMeasure } from '../../models/SampledValue';

export class MeterValuesRequestBuilder implements ByChargePointRequestBuilderInterface {
  build(station: Station, payload: any): MeterValuesRequest {
    const request = new MeterValuesRequest();
    request.connectorId = 1; // only support connector 1 at the moment, should be upgraded
    const sampledValue = new SampledValue();
    sampledValue.value = payload.value ?? station.meterValue;
    sampledValue.context = payload.context ?? ReadingContext.SamplePeriodic;
    sampledValue.measurand = payload.measurand ?? Measurand.EnergyActiveImportRegister;
    sampledValue.unit = payload.unit ?? UnitOfMeasure.Wh;
    sampledValue.location = payload.location ?? Location.Outlet;

    const meterValue = new MeterValue();
    meterValue.timestamp = new Date().toISOString();
    meterValue.sampledValue.push(sampledValue);
    request.meterValue.push(meterValue);
    if (station.currentTransactionId) {
      request.transactionId = station.currentTransactionId;
    }

    return request;
  }

  getOperationName = () => 'MeterValues';
}
