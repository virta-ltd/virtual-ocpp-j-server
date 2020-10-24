import * as WebSocket from 'ws';
import { Station } from './station.entity';

export class StationWebSocket {
  public station: Station;
  public wsClient: WebSocket;
  private connectedTime: Date;
  private pingInterval: NodeJS.Timeout;
  public constructor(station: Station) {
    this.station = station;

    this.createConnection();
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

    this.bindOnMessage();
    this.bindOnConnectionOpen();
    this.bindOnDisconnect();
    this.bindOnError();
  }

  private bindOnMessage() {
    this.wsClient.on('message', data => {
      console.log('data received', data);
    });
  }

  private bindOnError() {
    this.wsClient.on('error', err => {
      console.log('Error', err);
    });
  }

  private bindOnConnectionOpen() {
    this.wsClient.on('open', () => {
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
    });

    this.wsClient.on('pong', () => {
      console.log('received pong back');
    });
  }

  private bindOnDisconnect() {
    this.wsClient.on('close', (code: number, reason: string) => {
      clearInterval(this.pingInterval);
      const connectedMinutes = Math.floor(
        (new Date().getTime() - this.connectedTime.getTime()) / 1000 / 60,
      );
      const extraConnectedSeconds =
        ((new Date().getTime() - this.connectedTime.getTime()) / 1000) % 60;
      console.log(`Duration of the connection: ${connectedMinutes} minutes & ${extraConnectedSeconds} seconds.
Closing connection ${this.station.identity}. Code: ${code}. Reason: ${reason}.`);

      this.wsClient = null;

      // reconnecting after 1 minute
      setTimeout(() => {
        this.createConnection();
      }, 60000);
    });
  }
}
