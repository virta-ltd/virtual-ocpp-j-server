import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CreateOrUpdateStationDto } from './dto/create-update-station.dto';
import { GetStationsFilterDto } from './dto/get-station-filter.dto';
import { Station } from './station.entity';
import { StationsService } from './stations.service';

@Controller('stations')
export class StationsController {
  constructor(private stationsService: StationsService) {}

  @Get()
  getStations(@Query() filterDto: GetStationsFilterDto): Promise<Station[]> {
    return this.stationsService.getStations(filterDto);
  }

  @Get('/:id')
  getStationById(@Param('id', ParseIntPipe) id: number): Promise<Station> {
    return this.stationsService.getStationById(id);
  }

  @Post()
  createStation(
    @Body() createStationDto: CreateOrUpdateStationDto,
  ): Promise<Station> {
    return this.stationsService.createStation(createStationDto);
  }

  @Put('/:id')
  updateStation(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStationDto: CreateOrUpdateStationDto,
  ) {
    return this.stationsService.updateStation(id, updateStationDto);
  }
}
