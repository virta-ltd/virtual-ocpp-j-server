import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateOrUpdateStationDto } from './dto/create-update-station.dto';
import { GetStationsFilterDto } from './dto/get-station-filter.dto';
import { Station } from './station.entity';
import { StationRepository } from './station.repository';
import { StationWebSocketService } from './station-websocket.service';
import { StationWebSocketClient } from './station-websocket-client';
import { WebSocketReadyStates } from '../models/WebSocketReadyStates';

@Injectable()
export class StationsService {
  private logger = new Logger('StationsService');
  public connectedStationsClients: Set<StationWebSocketClient> = new Set<StationWebSocketClient>();
  constructor(
    @InjectRepository(StationRepository)
    private stationRepository: StationRepository,
    private stationWebSocketService: StationWebSocketService,
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
    const newStationWebSocketClient = this.stationWebSocketService.createStationWebSocket(station);
    this.connectedStationsClients.add(newStationWebSocketClient);
  }

  async connectAllStationsToCentralSystem() {
    let dbStations: Station[] = [];
    try {
      dbStations = await this.getStations({});
    } catch (error) {
      this.logger.error(`Error fetching stations information`, error?.stack ?? '');
    }

    // remove closing / closed sockets
    this.connectedStationsClients.forEach(client => {
      if (client.readyState !== WebSocketReadyStates.CONNECTING && client.readyState !== WebSocketReadyStates.OPEN) {
        this.connectedStationsClients.delete(client);
      }
    });

    const connectedStationsIdentity = [...this.connectedStationsClients].map(client => client.stationIdentity);

    const unconnectedStations = dbStations.filter(dbStation => !connectedStationsIdentity.includes(dbStation.identity));

    unconnectedStations.forEach(station => this.connectStationToCentralSystem(station));
  }
}
