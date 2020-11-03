import { ByChargePointRequestBuilderInterface } from './by-charge-point-request-builder-interface';
import { AuthorizeRequest } from '../../models/AuthorizeRequest';
import { Station } from 'src/stations/station.entity';

export class AuthorizeRequestBuilder implements ByChargePointRequestBuilderInterface {
  build(_: Station, payload: any): AuthorizeRequest {
    const request = new AuthorizeRequest();
    request.idTag = payload.idTag;
    return request;
  }

  getOperationName = () => 'Authorize';
}
