import { ByChargePointRequestBuilderInterface } from './by-charge-point-request-builder-interface';
import { Station } from 'src/stations/station.entity';
import { StartTransactionRequest } from '../../models/StartTransactionRequest';

export class StartTransactionRequestBuilder implements ByChargePointRequestBuilderInterface {
  build(station: Station, payload: any): StartTransactionRequest {
    const request = new StartTransactionRequest();
    request.connectorId = 1; // only support connector 1 at the moment, should be upgraded
    request.idTag = payload.idTag;
    request.meterStart = station.meterValue;
    request.timestamp = new Date().toISOString();
    return request;
  }

  getOperationName = () => 'StartTransaction';
}
