import { CallResultMessage } from '../../../models/CallResultMessage';
import { StationWebSocketClient } from '../../station-websocket-client';
import { Station } from '../../station.entity';

export interface CallResultMsgHandlerInterface {
  handle(wsClient: StationWebSocketClient, station: Station, requestFromCS: CallResultMessage): void | Promise<void>;
}
