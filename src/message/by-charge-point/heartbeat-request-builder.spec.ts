import { HeartbeatRequestBuilder } from './heartbeat-request-builder';

describe('HeartbeatRequestBuilder', () => {
  test('build method', () => {
    const builder = new HeartbeatRequestBuilder();
    const request = builder.build();
    expect(request).toMatchObject({});
  });

  test('getOperationName method', () => {
    const builder = new HeartbeatRequestBuilder();
    expect(builder.getOperationName()).toStrictEqual('Heartbeat');
  });
});
