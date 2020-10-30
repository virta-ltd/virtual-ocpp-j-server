import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageModule } from '../message/message.module';
import { StationWebSocketService } from './station-websocket.service';
import { StationRepository } from './station.repository';
import { StationsController } from './stations.controller';
import { StationsService } from './stations.service';

@Module({
  imports: [TypeOrmModule.forFeature([StationRepository]), MessageModule],
  controllers: [StationsController],
  providers: [StationWebSocketService, StationsService],
  exports: [StationsService],
})
export class StationsModule {}
