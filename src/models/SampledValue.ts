export class SampledValue {
  value: string;
  context?: ReadingContext;
  format?: ValueFormat;
  measurand?: Measurand;
  phase?: Phase;
  location?: Location;
  unit?: UnitOfMeasure;
}

export enum ReadingContext {
  InterruptionBegin = 'Interruption.Begin',
  InterruptionEnd = 'Interruption.End',
  SampleClock = 'Sample.Clock',
  SamplePeriodic = 'Sample.Periodic',
  TransactionBegin = 'Transaction.Begin',
  TransactionEnd = 'Transaction.End',
  Trigger = 'Trigger',
  Other = 'Other',
}

export enum ValueFormat {
  Raw = 'Raw',
  SignedData = 'SignedData',
}

export enum Measurand {
  EnergyActiveExportRegister = 'Energy.Active.Export.Register',
  EnergyActiveImportRegister = 'Energy.Active.Import.Register',
  EnergyReactiveExportRegister = 'Energy.Reactive.Export.Register',
  EnergyReactiveImportRegister = 'Energy.Reactive.Import.Register',
  EnergyActiveExportInterval = 'Energy.Active.Export.Interval',
  EnergyActiveImportInterval = 'Energy.Active.Import.Interval',
  EnergyReactiveExportInterval = 'Energy.Reactive.Export.Interval',
  EnergyReactiveImportInterval = 'Energy.Reactive.Import.Interval',
  PowerActiveExport = 'Power.Active.Export',
  PowerActiveImport = 'Power.Active.Import',
  PowerOffered = 'Power.Offered',
  PowerReactiveExport = 'Power.Reactive.Export',
  PowerReactiveImport = 'Power.Reactive.Import',
  PowerFactor = 'Power.Factor',
  CurrentImport = 'Current.Import',
  CurrentExport = 'Current.Export',
  CurrentOffered = 'Current.Offered',
  Voltage = 'Voltage',
  Frequency = 'Frequency',
  Temperature = 'Temperature',
  SoC = 'SoC',
  RPM = 'RPM',
}

export enum Phase {
  L1 = 'L1',
  L2 = 'L2',
  L3 = 'L3',
  N = 'N',
  L1N = 'L1-N',
  L2N = 'L2-N',
  L3N = 'L3-N',
  L1L2 = 'L1-L2',
  L2L3 = 'L2-L3',
  L3L1 = 'L3-L1',
}

export enum Location {
  Cable = 'Cable',
  EV = 'EV',
  Inlet = 'Inlet',
  Outlet = 'Outlet',
  Body = 'Body',
}

export enum UnitOfMeasure {
  Wh = 'Wh',
  kWh = 'kWh',
  varh = 'varh',
  kvarh = 'kvarh',
  W = 'W',
  kW = 'kW',
  VA = 'VA',
  kVA = 'kVA',
  var = 'var',
  kvar = 'kvar',
  A = 'A',
  V = 'V',
  K = 'K',
  Celcius = 'Celcius',
  Fahrenheit = 'Fahrenheit',
  Percent = 'Percent',
}
