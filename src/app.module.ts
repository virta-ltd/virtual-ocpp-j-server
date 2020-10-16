import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StationsModule } from './stations/stations.module';

@Module({
  imports: [StationsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
