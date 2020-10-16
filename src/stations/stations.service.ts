import { Injectable } from '@nestjs/common';
import { CreateOrUpdateStationDto } from './dto/create-update-station.dto';
import { GetStationsFilterDto } from './dto/get-station-filter.dto';
import { Station } from './station.model';

@Injectable()
export class StationsService {
  private stations: Station[] = [];

  getAllStations(): Station[] {
    return this.stations;
  }

  getStationsWithFilter(filterDto: GetStationsFilterDto): Station[] {
    const { identity } = filterDto;

    const stations = this.getAllStations();

    return stations.filter(station => station.identity.includes(identity));
  }

  getStationById(id: number): Station {
    return this.stations.find(station => station.id === id);
  }

  createStation(createStationDto: CreateOrUpdateStationDto) {
    const {
      identity,
      centralSystemUrl,
      meterValue,
      currentChargingPower,
    } = createStationDto;
    const station: Station = {
      id: this.stations.length + 1,
      identity: identity + (this.stations.length + 1),
      centralSystemUrl,
      meterValue: meterValue ?? 0,
      chargeInProgress: false,
      currentTransactionId: 0,
      currentChargingPower: currentChargingPower ?? 10,
    };

    this.stations.push(station);
    return station;
  }

  updateStation(id: number, updateStationDto: CreateOrUpdateStationDto) {
    const {
      identity,
      centralSystemUrl,
      meterValue,
      currentChargingPower,
    } = updateStationDto;

    const station = this.getStationById(id);

    if (!station) {
      return null;
    }

    station.identity = identity ?? station.identity;
    station.centralSystemUrl = centralSystemUrl ?? station.centralSystemUrl;
    station.meterValue = meterValue ?? station.meterValue;
    station.currentChargingPower = currentChargingPower ?? currentChargingPower;

    return station;
  }
}
