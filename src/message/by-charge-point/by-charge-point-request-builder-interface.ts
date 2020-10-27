import { BootNotifcationRequest } from 'src/models/BootNotificationRequest';
import { Station } from 'src/stations/station.entity';

export interface ByChargePointRequestBuilderInterface {
  build(station: Station, payload?: any): BootNotifcationRequest;
}
