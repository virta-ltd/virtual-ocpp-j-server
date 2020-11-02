import { BootNotifcationRequest } from '../../models/BootNotificationRequest';
import { Station } from 'src/stations/station.entity';
import { ByChargePointRequestBuilderInterface } from './by-charge-point-request-builder-interface';

export class BootNotificationRequestBuilder implements ByChargePointRequestBuilderInterface {
  build(station: Station, payload: any) {
    const request = new BootNotifcationRequest();
    request.chargePointVendor = payload?.vendor ?? station.vendor;
    request.chargePointModel = payload?.model ?? station.model;
    return request;
  }

  getOperationName = () => 'BootNotification';
}
