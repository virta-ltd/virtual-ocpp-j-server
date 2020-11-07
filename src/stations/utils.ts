const calculatePowerUsageInWh = (startTime: Date, chargingPower: number): number => {
  const hours = (new Date().getTime() - startTime.getTime()) / 1000 / 3600;
  return Math.floor(chargingPower * hours);
};

export { calculatePowerUsageInWh };
