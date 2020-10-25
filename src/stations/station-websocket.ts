import * as WebSocket from 'ws';
import { Station } from './station.entity';

export class StationWebSocket {
  public station: Station;
  public wsClient: WebSocket;
  public connectedTime: Date;
  public pingInterval: NodeJS.Timeout;
  public constructor(station: Station) {
    this.station = station;

    this.createConnection();
    this.bindMethods();
  }

  private bindMethods() {
    this.wsClient.on('message', this.onMessage);
    this.wsClient.on('open', this.onConnectionOpen);
    this.wsClient.on('error', this.onError);
    this.wsClient.on('close', this.onConnectionClosed);
  }

  private createConnection() {
    console.log(`creating new connection ${this.station.identity}`);
    const protocols = 'ocpp1.6';
    try {
      this.wsClient = new WebSocket(
        `${this.station.centralSystemUrl}/${this.station.identity}`,
        protocols,
      );
    } catch (error) {
      console.log(error);
    }
  }

  public onMessage(data: string) {
    console.log('data received', data);
  }

  public onError(err: Error) {
    console.log('Error', err);
  }

  public onConnectionOpen() {
    this.connectedTime = new Date();

    this.pingInterval = setInterval(() => {
      console.log('pinging server by station', this.station.identity);
      this.wsClient.ping('ping');
    }, 60000);

    console.log(
      `connection opened for station ${this.station.identity}, sending Boot`,
    );

    // testing closing
    // setTimeout(() => {
    //   if (this.station.identity == 'STATION123') {
    //     this.wsClient.close(1000, 'Testing');
    //   }
    // }, 10000);

    // this.wsClient.on('pong', () => {
    //   console.log('received pong back');
    // });
  }

  public onConnectionClosed(code: number, reason: string) {
    clearInterval(this.pingInterval);

    const connectedDurationInSeconds =
      (new Date().getTime() - this.connectedTime.getTime()) / 1000;
    const connectedMinutes = Math.floor(connectedDurationInSeconds / 60);
    const extraConnectedSeconds = connectedDurationInSeconds % 60;
    console.log(`Duration of the connection: ${connectedMinutes} minutes & ${extraConnectedSeconds} seconds.
Closing connection ${this.station.identity}. Code: ${code}. Reason: ${reason}.`);

    this.wsClient = null;

    // reconnecting after 1 minute
    setTimeout(() => {
      this.createConnection();
      this.bindMethods();
    }, 60000);
  }
}
