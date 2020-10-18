import { EntityRepository, Repository } from 'typeorm';
import { CreateOrUpdateStationDto } from './dto/create-update-station.dto';
import { GetStationsFilterDto } from './dto/get-station-filter.dto';
import { Station } from './station.entity';

@EntityRepository(Station)
export class StationRepository extends Repository<Station> {
  async createStation(createStationDto: CreateOrUpdateStationDto) {
    const {
      identity,
      centralSystemUrl,
      meterValue,
      currentChargingPower,
    } = createStationDto;

    const station = this.create();
    station.identity =
      identity ??
      `${process.env.DEFAULT_IDENTITY_NAME}${Math.round(
        Math.random() * 100000,
      )}`;
    station.centralSystemUrl =
      centralSystemUrl ?? `${process.env.DEFAULT_CENTRAL_SYSTEM_URL}`;
    station.meterValue = meterValue ?? 0;
    station.currentChargingPower = currentChargingPower ?? 10;

    await station.save();

    return station;
  }

  async updateStation(
    station: Station,
    updateStationDto: CreateOrUpdateStationDto,
  ) {
    const {
      identity,
      centralSystemUrl,
      meterValue,
      currentChargingPower,
    } = updateStationDto;

    station.identity = identity ?? station.identity;
    station.centralSystemUrl = centralSystemUrl ?? station.centralSystemUrl;
    station.meterValue = meterValue ?? station.meterValue;
    station.currentChargingPower = currentChargingPower ?? currentChargingPower;
    station.save();

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
