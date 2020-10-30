import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { StationsService } from './stations/stations.service';

const port = process.env.APP_PORT || 8080;

async function bootstrap() {
  const logger = new Logger('bootstrap');
  const app = await NestFactory.create(AppModule);

  const stationsService = app.get(StationsService);
  await stationsService.connectAllStationsToCentralSystem();

  await app.listen(port);
  logger.log(`Application listenning on port ${port}`);
}
bootstrap();
