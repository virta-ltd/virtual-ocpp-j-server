import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateOrUpdateStationDto } from './dto/create-update-station.dto';
import { GetStationsFilterDto } from './dto/get-station-filter.dto';
import { Station } from './station.entity';
import { StationRepository } from './station.repository';

@Injectable()
export class StationsService {
  constructor(
    @InjectRepository(StationRepository)
    private stationRepository: StationRepository,
  ) {}

  async getStations(filterDto: GetStationsFilterDto): Promise<Station[]> {
    return this.stationRepository.getStations(filterDto);
  }

  async getStationById(id: number): Promise<Station> {
    const station = await this.stationRepository.findOne(id);

    if (!station) {
      throw new NotFoundException(`Station ${id} not found`);
    }

    return station;
  }

  async createStation(createStationDto: CreateOrUpdateStationDto) {
    return this.stationRepository.createStation(createStationDto);
  }

  async updateStation(id: number, updateStationDto: CreateOrUpdateStationDto) {
    const station = await this.getStationById(id);

    return this.stationRepository.updateStation(station, updateStationDto);
  }
}
