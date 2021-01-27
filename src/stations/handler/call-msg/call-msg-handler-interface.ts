import { StationWebSocketClient } from '../../station-websocket-client';
import { Station } from '../../station.entity';

export interface CallMsgHandlerInterface {
  handle(wsClient: StationWebSocketClient, station: Station, requestFromCS: string): void | Promise<void>;
}
