import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateOrUpdateStationDto } from './dto/create-update-station.dto';
import { GetStationsFilterDto } from './dto/get-station-filter.dto';
import { Station } from './station.entity';
import { StationRepository } from './station.repository';
import { StationWebSocket } from './station-websocket';
import { ByChargePointOperationMessageFactory } from '../message/by-charge-point/by-charge-point-operation-message-factory';

@Injectable()
export class StationsService {
  private logger = new Logger('StationsService');
  public connectedStations: StationWebSocket[] = [];
  constructor(
    @InjectRepository(StationRepository)
    private stationRepository: StationRepository,
    private byChargePointOperationMessageFactory: ByChargePointOperationMessageFactory,
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
    const station = await this.stationRepository.createStation(createStationDto);

    // station is created, connect it to Central System
    this.connectStationToCentralSystem(station);
    return station;
  }

  async updateStation(id: number, updateStationDto: CreateOrUpdateStationDto) {
    const station = await this.getStationById(id);

    return this.stationRepository.updateStation(station, updateStationDto);
  }

  connectStationToCentralSystem(station: Station) {
    const newStationWebSocketClient = new StationWebSocket(station);
    this.connectedStations.push(newStationWebSocketClient);

    setTimeout(() => {
      if (newStationWebSocketClient.wsClient.readyState === 1) {
        const message = this.byChargePointOperationMessageFactory.createMessage(
          'BootNotification',
          station,
          newStationWebSocketClient.getMessageIdForCall(),
        );
        newStationWebSocketClient.wsClient.send(message);
      }
    }, 1000);
  }

  async connectAllStationsToCentralSystem() {
    let dbStations: Station[] = [];
    try {
      dbStations = await this.getStations({});
    } catch (error) {
      this.logger.error(`Error fetching stations information`, error?.stack ?? '');
      console.log('Error fetching stations information');
    }

    const connectedStationsIdentity = this.connectedStations.map(
      client => client.wsClient.readyState === 1 && client.station.identity,
    );
    const unconnectedStations = dbStations.filter(
      dbStation => connectedStationsIdentity.indexOf(dbStation.identity) < 0,
    );

    unconnectedStations.forEach(station => this.connectStationToCentralSystem(station));
  }
}
