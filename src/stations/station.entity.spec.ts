import { Station } from './station.entity';

describe('Station entity', () => {
  let station: Station;

  beforeEach(() => {
    station = new Station();
  });

  it('has default value', () => {
    expect(station.currentTransactionId).toEqual(0);
    expect(station.chargeInProgress).toBeFalsy();
  });
});
