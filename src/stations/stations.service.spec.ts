import { Test, TestingModule } from '@nestjs/testing';
import { GetStationsFilterDto } from './dto/get-station-filter.dto';
import { Station } from './station.entity';
import { StationRepository } from './station.repository';
import { StationsService } from './stations.service';

const mockStationRepository = () => ({
  getStations: jest.fn(),
  findOne: jest.fn(),
  createStation: jest.fn(),
  updateStation: jest.fn(),
});

describe('StationsService', () => {
  let stationService: StationsService;
  let stationRepository: StationRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StationsService,
        {
          provide: StationRepository,
          useFactory: mockStationRepository,
        },
      ],
    }).compile();

    stationService = module.get<StationsService>(StationsService);
    stationRepository = module.get<StationRepository>(StationRepository);
  });

  describe('get stations', () => {
    it('gets all stations from the repository', async () => {
      const station = new Station();

      const getStationFn = stationRepository.getStations as jest.Mock;
      getStationFn.mockResolvedValue([station]);

      const filterDto = {};

      const result = await stationService.getStations(filterDto);

      expect(getStationFn).toHaveBeenCalled();

      expect(result).toEqual([station]);
    });

    it('get stations with filter by identity', () => {
      const filterDto: GetStationsFilterDto = { identity: 'ABC' };

      stationService.getStations(filterDto);

      expect(stationRepository.getStations).toHaveBeenCalledWith(filterDto);
    });
  });

  describe('get stations by id', () => {
    it('calls stationRepository.findOne() and successfully retrieve and return the station', async () => {
      const findOneFn = stationRepository.findOne as jest.Mock;
      const station = new Station();
      findOneFn.mockResolvedValue(station);

      const stationId = 1;
      const result = await stationService.getStationById(stationId);

      expect(findOneFn).toHaveBeenCalledWith(stationId);
      expect(result).toEqual(station);
    });

    it('throws an error as station is not found', () => {
      const findOneFn = stationRepository.findOne as jest.Mock;
      findOneFn.mockResolvedValue(null);

      expect(stationService.getStationById(1)).rejects.toThrow();
    });
  });

  describe('create station', () => {
    it('calls stationRepository.createStation() and returns the result', async () => {
      const createStationFn = stationRepository.createStation as jest.Mock;
      const station = new Station();
      createStationFn.mockResolvedValue(station);

      const result = await stationService.createStation({});

      expect(createStationFn).toHaveBeenCalledWith({});
      expect(result).toEqual(station);
    });
  });

  describe('update station', () => {
    it('calls stationRepository.update() and returns the result', async () => {
      const station = new Station();
      station.id = 1;
      stationService.getStationById = jest.fn().mockResolvedValue(station);
      const updateStationFn = stationRepository.updateStation as jest.Mock;
      updateStationFn.mockResolvedValue(station);

      const result = await stationService.updateStation(station.id, {});

      expect(updateStationFn).toHaveBeenCalledWith(station, {});
      expect(result).toEqual(station);
    });
  });
});
