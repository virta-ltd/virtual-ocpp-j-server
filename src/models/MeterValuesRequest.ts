import { MeterValue } from './MeterValue';

export class MeterValuesRequest {
  connectorId: number;
  transactionId?: number;
  metervalue: MeterValue[];
}
