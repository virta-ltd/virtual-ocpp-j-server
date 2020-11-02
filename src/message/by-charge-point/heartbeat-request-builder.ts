import { ByChargePointRequestBuilderInterface } from './by-charge-point-request-builder-interface';
import { HeartbeatRequest } from '../../models/HeartbeatRequest';

export class HeartbeatRequestBuilder implements ByChargePointRequestBuilderInterface {
  build() {
    return new HeartbeatRequest();
  }

  getOperationName = () => 'Heartbeat';
}
