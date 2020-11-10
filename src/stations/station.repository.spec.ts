require('dotenv').config('');
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { CreateOrUpdateStationDto } from './dto/create-update-station.dto';
import { GetStationsFilterDto } from './dto/get-station-filter.dto';
import { Station } from './station.entity';
import { StationRepository } from './station.repository';

describe('StationRepository', () => {
  let stationRepository: StationRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [StationRepository, Repository],
    }).compile();

    stationRepository = module.get<StationRepository>(StationRepository);
  });

  describe('createStation', () => {
    let saveFn: jest.Mock;
    let latestStation: Station;

    beforeEach(() => {
      saveFn = jest.fn();
      stationRepository.create = jest.fn().mockReturnValue({ save: saveFn });
      saveFn.mockResolvedValue(undefined);
    });

    it('creates station successfully without data', async () => {
      latestStation = new Station();
      latestStation.id = 3;
      jest.spyOn(stationRepository, 'getLatestStation').mockResolvedValue(latestStation);

      const dto = {};

      const station = await stationRepository.createStation(dto);

      expect(saveFn).toHaveBeenCalled();
      expect(station.identity).toEqual(`${process.env.DEFAULT_IDENTITY_NAME}${latestStation.id + 1}`);
      expect(station.centralSystemUrl).toEqual(process.env.DEFAULT_CENTRAL_SYSTEM_URL);
      expect(station.meterValue).toEqual(0);
      expect(station.currentChargingPower).toEqual(11000);
    });

    it('creates station successfully without data & no latest station is found', async () => {
      jest.spyOn(stationRepository, 'getLatestStation').mockResolvedValue(null);
      const dto = {};

      const station = await stationRepository.createStation(dto);

      expect(saveFn).toHaveBeenCalled();
      expect(station.identity).toEqual(`${process.env.DEFAULT_IDENTITY_NAME}1`);
      expect(station.centralSystemUrl).toEqual(process.env.DEFAULT_CENTRAL_SYSTEM_URL);
      expect(station.meterValue).toEqual(0);
      expect(station.currentChargingPower).toEqual(11000);
    });

    it('creates station with provided data', async () => {
      const dto: CreateOrUpdateStationDto = {
        identity: 'NEW_STATION',
        centralSystemUrl: 'ws://someurl',
        meterValue: 200,
        currentChargingPower: 2000,
      };

      const station = await stationRepository.createStation(dto);

      expect(saveFn).toHaveBeenCalled();
      expect(station.identity).toEqual(dto.identity);
      expect(station.centralSystemUrl).toEqual(dto.centralSystemUrl);
      expect(station.meterValue).toEqual(dto.meterValue);
      expect(station.currentChargingPower).toEqual(dto.currentChargingPower);
    });
  });

  describe('updateStation', () => {
    let saveFn: jest.Mock;
    let station: Station;

    beforeEach(() => {
      saveFn = jest.fn();
      saveFn.mockResolvedValue(undefined);

      station = new Station();
      station.identity = 'ABCDEF';
      station.meterValue = 10;
      station.currentChargingPower = 20;
      station.centralSystemUrl = 'ws://abc';
      station.chargeInProgress = false;
      station.currentTransactionId = null;
      station.save = saveFn;
    });
    it('updates station to new value', async () => {
      const dto: CreateOrUpdateStationDto = {
        identity: 'NEW_STATION',
        centralSystemUrl: 'ws://someurl',
        meterValue: 200,
        currentChargingPower: 2000,
        chargeInProgress: true,
        currentTransactionId: 1000,
      };

      await stationRepository.updateStation(station, dto);

      expect(saveFn).toHaveBeenCalled();
      expect(station.identity).toEqual(dto.identity);
      expect(station.centralSystemUrl).toEqual(dto.centralSystemUrl);
      expect(station.meterValue).toEqual(dto.meterValue);
      expect(station.currentChargingPower).toEqual(dto.currentChargingPower);
      expect(station.chargeInProgress).toEqual(dto.chargeInProgress);
      expect(station.currentTransactionId).toEqual(dto.currentTransactionId);
    });

    it('updates station to new value with only certain values', async () => {
      const dto: CreateOrUpdateStationDto = {
        chargeInProgress: true,
        currentTransactionId: 1000,
      };

      await stationRepository.updateStation(station, dto);

      expect(saveFn).toHaveBeenCalled();
      expect(station.chargeInProgress).toEqual(dto.chargeInProgress);
      expect(station.currentTransactionId).toEqual(dto.currentTransactionId);
    });
  });

  describe('getStations', () => {
    let mockQuery: any;
    let createQueryBuilderFn: jest.SpyInstance;

    beforeEach(() => {
      mockQuery = {
        andWhere: jest.fn(),
        getMany: jest.fn(),
      };
      createQueryBuilderFn = jest.spyOn(stationRepository, 'createQueryBuilder').mockReturnValue(mockQuery);
    });
    it('returns all station with query builder', async () => {
      const station = new Station();
      mockQuery.getMany.mockResolvedValue([station]);

      const stations = await stationRepository.getStations({});

      expect(stations).toEqual([station]);
      expect(createQueryBuilderFn).toHaveBeenCalledWith('station');
      expect(mockQuery.andWhere).not.toHaveBeenCalled();
      expect(mockQuery.getMany).toHaveBeenCalled();
    });

    it('returns all station with filted query', async () => {
      const station = new Station();
      const dto: GetStationsFilterDto = { identity: 'abc' };
      mockQuery.getMany.mockResolvedValue([station]);
      const stations = await stationRepository.getStations(dto);

      expect(stations).toEqual([station]);
      expect(createQueryBuilderFn).toHaveBeenCalledWith('station');
      expect(mockQuery.andWhere).toHaveBeenCalledWith('station.identity like :identity', {
        identity: `%${dto.identity}%`,
      });
      expect(mockQuery.getMany).toHaveBeenCalled();
    });
  });
});
