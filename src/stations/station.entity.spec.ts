import { Station } from './station.entity';

describe('Station entity', () => {
  let station: Station;

  beforeEach(() => {
    station = new Station();
  });

  it('has default value', () => {
    expect(station.currentTransactionId).toBeNull();
    expect(station.chargeInProgress).toBeFalsy();
    expect(station.model).toBe(process.env.DEFAULT_MODEL);
    expect(station.vendor).toBe(process.env.DEFAULT_VENDOR);
    expect(station.meterValue).toBe(0);
    expect(station.currentChargingPower).toBe(11000);
  });
});
