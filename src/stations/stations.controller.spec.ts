import { Test, TestingModule } from '@nestjs/testing';
import { CreateOrUpdateStationDto } from './dto/create-update-station.dto';
import { GetStationsFilterDto } from './dto/get-station-filter.dto';
import { Station } from './station.entity';
import { StationRepository } from './station.repository';
import { StationsController } from './stations.controller';
import { StationsService } from './stations.service';

const mockStationService = () => ({
  getStations: jest.fn(),
  getStationById: jest.fn(),
  createStation: jest.fn(),
  updateStation: jest.fn(),
  sendStationOperationRequest: jest.fn(),
});

describe('StationsController', () => {
  let stationsController: StationsController;
  let stationService: StationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: StationRepository,
          useValue: null,
        },
        {
          provide: StationsService,
          useFactory: mockStationService,
        },
      ],
      controllers: [StationsController],
    }).compile();

    stationsController = module.get<StationsController>(StationsController);
    stationService = module.get<StationsService>(StationsService);
  });

  describe('getStations', () => {
    it('without filter', async () => {
      const station1 = new Station();
      station1.identity = 'station1';

      const result = [station1];

      const getStationsFn = stationService.getStations as jest.Mock;
      getStationsFn.mockResolvedValue(result);

      expect(await stationsController.getStations({})).toBe(result);
    });

    it('with filter', async () => {
      const station1 = new Station();
      station1.identity = 'station1';

      const result = [station1];

      const dto: GetStationsFilterDto = { identity: 'station1' };

      const getStationsFn = stationService.getStations as jest.Mock;
      getStationsFn.mockResolvedValue(result);

      expect(await stationsController.getStations(dto)).toBe(result);
      expect(getStationsFn).toBeCalledWith(dto);
    });

    it('by id', async () => {
      const station1 = new Station();
      station1.id = 1;
      station1.identity = 'station1';

      const getStationByIdFn = stationService.getStationById as jest.Mock;
      getStationByIdFn.mockResolvedValue(station1);

      expect(await stationsController.getStationById(station1.id)).toBe(station1);
      expect(getStationByIdFn).toBeCalledWith(station1.id);
    });
  });

  describe('createStation', () => {
    it('with dto', () => {
      const createStationFn = stationService.createStation as jest.Mock;

      const dto: CreateOrUpdateStationDto = { identity: 'abc' };

      stationsController.createStation(dto);

      expect(createStationFn).toBeCalledWith(dto);
    });
  });

  describe('updateStation', () => {
    it('with dto', () => {
      const updateStationFn = stationService.updateStation as jest.Mock;

      const dto: CreateOrUpdateStationDto = { identity: 'abc' };

      stationsController.updateStation(1, dto);

      expect(updateStationFn).toBeCalledWith(1, dto);
    });
  });

  describe('createStationOperation', () => {
    test('that sendStationOperationRequest is called from station service', async () => {
      const sendStationOperationRequestFn = stationService.sendStationOperationRequest as jest.Mock;

      await stationsController.createStationOperation(1, 'Heartbeat', {});

      expect(sendStationOperationRequestFn).toBeCalledWith(1, 'Heartbeat', {});
    });
  });
});
