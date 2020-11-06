import { calculatePowerUsageInWh } from './utils';

describe('calculatePowerUsageInWh', () => {
  const currentDate = 1577829600000;
  beforeEach(() => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(currentDate);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  it('returns correct calculation value for one hour', () => {
    const oneHourInMilliseconds = 3600000;
    const startTime = new Date(currentDate - oneHourInMilliseconds);
    const result = calculatePowerUsageInWh(startTime, 11000);
    expect(result).toEqual(11000);
  });

  it('returns correct calculation value for 20 mins', () => {
    const oneHourInMilliseconds = 1200000;
    const startTime = new Date(currentDate - oneHourInMilliseconds);
    const result = calculatePowerUsageInWh(startTime, 11000);
    expect(result).toEqual(3666);
  });
});
