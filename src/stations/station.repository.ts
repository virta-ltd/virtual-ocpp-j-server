import { Logger } from '@nestjs/common';
import { EntityRepository, Repository } from 'typeorm';
import { CreateOrUpdateStationDto } from './dto/create-update-station.dto';
import { GetStationsFilterDto } from './dto/get-station-filter.dto';
import { Station } from './station.entity';

@EntityRepository(Station)
export class StationRepository extends Repository<Station> {
  async createStation(createStationDto: CreateOrUpdateStationDto) {
    const { identity, centralSystemUrl, meterValue, currentChargingPower } = createStationDto;

    const station = this.create();
    station.identity = identity ?? `${process.env.DEFAULT_IDENTITY_NAME}${Math.round(Math.random() * 100000)}`;
    station.centralSystemUrl = centralSystemUrl ?? `${process.env.DEFAULT_CENTRAL_SYSTEM_URL}`;
    station.meterValue = meterValue ?? 0;
    station.currentChargingPower = currentChargingPower ?? 11000;

    await station.save();

    return station;
  }

  async updateStation(station: Station, updateStationDto: CreateOrUpdateStationDto) {
    Object.keys(updateStationDto).forEach(key => {
      station[key] = updateStationDto[key];
    });
    await station.save();

    return station;
  }

  async getStations(filterDto: GetStationsFilterDto): Promise<Station[]> {
    const { identity } = filterDto;

    const query = this.createQueryBuilder('station');

    if (identity) {
      query.andWhere('station.identity like :identity', {
        identity: `%${identity}%`,
      });
    }

    const stations = await query.getMany();

    return stations;
  }
}
