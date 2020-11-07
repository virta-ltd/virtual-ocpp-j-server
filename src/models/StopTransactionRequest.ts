import { MeterValue } from './MeterValue';

export class StopTransactionRequest {
  transactionId: number;
  timestamp: string;
  meterStop: number;
  transactionData?: MeterValue[];
}
