import { Test, TestingModule } from '@nestjs/testing';
import { StationsService } from './stations.service';

describe('StationsService', () => {
  let service: StationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StationsService],
    }).compile();

    service = module.get<StationsService>(StationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
