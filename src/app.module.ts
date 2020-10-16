import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmConfig } from './config/typeorm.config';
import { StationsModule } from './stations/stations.module';

@Module({
  imports: [TypeOrmModule.forRoot(typeOrmConfig), StationsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
