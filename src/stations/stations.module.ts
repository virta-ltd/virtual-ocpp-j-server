import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageModule } from '../message/message.module';
import { StationRepository } from './station.repository';
import { StationsController } from './stations.controller';
import { StationsService } from './stations.service';

@Module({
  imports: [TypeOrmModule.forFeature([StationRepository]), MessageModule],
  controllers: [StationsController],
  providers: [StationsService],
  exports: [StationsService],
})
export class StationsModule {}
