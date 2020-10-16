import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CreateOrUpdateStationDto } from './dto/create-update-station.dto';
import { GetStationsFilterDto } from './dto/get-station-filter.dto';
import { Station } from './station.model';
import { StationsService } from './stations.service';

@Controller('stations')
export class StationsController {
  constructor(private stationsService: StationsService) {}

  @Get()
  getStations(@Query() filterDto: GetStationsFilterDto): Station[] {
    console.log(filterDto);
    if (Object.keys(filterDto).length) {
      console.log('here');
      return this.stationsService.getStationsWithFilter(filterDto);
    }
    return this.stationsService.getAllStations();
  }

  @Get('/:id')
  getStationById(@Param('id') id: string): Station {
    return this.stationsService.getStationById(parseInt(id));
  }

  @Post()
  createStation(@Body() createStationDto: CreateOrUpdateStationDto) {
    return this.stationsService.createStation(createStationDto);
  }

  @Put('/:id')
  updateStation(
    @Param('id') id: string,
    @Body() updateStationDto: CreateOrUpdateStationDto,
  ) {
    return this.stationsService.updateStation(parseInt(id), updateStationDto);
  }
}
