import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageModule } from '../message/message.module';
import { CallMsgHandlerFactory } from './handler/call-msg-handler-factory';
import { RemoteStartTransactionMsgHandler } from './handler/remote-start-transaction-msg-handler';
import { RemoteStopTransactionMsgHandler } from './handler/remote-stop-transaction-msg-handler';
import { StationWebSocketService } from './station-websocket.service';
import { StationRepository } from './station.repository';
import { StationsController } from './stations.controller';
import { StationsService } from './stations.service';

@Module({
  imports: [TypeOrmModule.forFeature([StationRepository]), MessageModule],
  controllers: [StationsController],
  providers: [
    StationWebSocketService,
    StationsService,
    CallMsgHandlerFactory,
    RemoteStartTransactionMsgHandler,
    RemoteStopTransactionMsgHandler,
  ],
  exports: [StationsService],
})
export class StationsModule {}
