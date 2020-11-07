import { ByChargePointRequestBuilderInterface } from './by-charge-point-request-builder-interface';
import { Station } from 'src/stations/station.entity';
import { StopTransactionRequest } from '../../models/StopTransactionRequest';

export class StopTransactionRequestBuilder implements ByChargePointRequestBuilderInterface {
  build(station: Station, payload: any): StopTransactionRequest {
    const request = new StopTransactionRequest();
    request.transactionId = payload.transactionId ?? station.currentTransactionId;
    request.meterStop = station.meterValue;
    request.timestamp = new Date().toISOString();
    payload.transactionData ? (request.transactionData = payload.transactionData) : '';
    return request;
  }

  getOperationName = () => 'StopTransaction';
}
