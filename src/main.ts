import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { StationsService } from './stations/stations.service';

const port = process.env.APP_PORT || 8080;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const stationsService = app.get(StationsService);
  stationsService.connectAllStationsToCentralSystem();

  await app.listen(port);
}
bootstrap();
