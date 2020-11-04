import { ByChargePointRequestBuilderInterface } from './by-charge-point-request-builder-interface';
import { Station } from '../../stations/station.entity';
import { StatusNotificationRequest } from '../../models/StatusNotificationRequest';
import { StatusNotificationStatusEnum } from '../../models/StatusNotificationStatusEnum';
import { StatusNotificationErrorCodeEnum } from '../../models/StatusNotificationErrorCodeEnum';

export class StatusNotificationRequestBuilder implements ByChargePointRequestBuilderInterface {
  build(_: Station, payload: any): StatusNotificationRequest {
    const request = new StatusNotificationRequest();
    request.connectorId = 1; // only support connector 1 at the moment, should be upgraded
    request.errorCode = payload.errorCode ?? StatusNotificationErrorCodeEnum.NoError;
    request.status = payload.status ?? StatusNotificationStatusEnum.Available;
    request.timestamp = new Date().toISOString();
    return request;
  }

  getOperationName = () => 'StatusNotification';
}
