import {
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreateOrUpdateStationDto } from './dto/create-update-station.dto';
import { GetStationsFilterDto } from './dto/get-station-filter.dto';
import { StationOperationDto } from './dto/station-operation-dto';
import { Station } from './station.entity';
import { StationsService } from './stations.service';

@Controller('stations')
export class StationsController {
  private logger = new Logger('StationsController');
  constructor(private stationsService: StationsService) {}

  @Get()
  @UsePipes(ValidationPipe)
  getStations(@Query() filterDto: GetStationsFilterDto): Promise<Station[]> {
    return this.stationsService.getStations(filterDto);
  }

  @Get('/:id')
  getStationById(@Param('id', ParseIntPipe) id: number): Promise<Station> {
    return this.stationsService.getStationById(id);
  }

  @Post()
  @UsePipes(new ValidationPipe({ skipMissingProperties: true }))
  createStation(@Body() createStationDto: CreateOrUpdateStationDto): Promise<Station> {
    this.logger.log(`Creating new station. Data: ${JSON.stringify(createStationDto)}`);
    return this.stationsService.createStation(createStationDto);
  }

  @Put('/:id')
  updateStation(@Param('id', ParseIntPipe) id: number, @Body() updateStationDto: CreateOrUpdateStationDto) {
    return this.stationsService.updateStation(id, updateStationDto);
  }

  @Post('/:id/operations/:operation')
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ skipMissingProperties: true }))
  createStationOperation(
    @Param('id', ParseIntPipe) id: number,
    @Param('operation') operationName: string,
    @Body() stationOperationDto: StationOperationDto,
  ) {
    return this.stationsService.sendStationOperationRequest(id, operationName, stationOperationDto);
  }
}
