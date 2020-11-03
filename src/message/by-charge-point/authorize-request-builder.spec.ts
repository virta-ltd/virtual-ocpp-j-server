import { Test } from '@nestjs/testing';
import { Station } from '../../stations/station.entity';
import { AuthorizeRequestBuilder } from './authorize-request-builder';

describe('AuthorizeRequestBuilder', () => {
  let authorizeRequestBuilder: AuthorizeRequestBuilder;
  let station: Station;

  beforeEach(async () => {
    const testModule = await Test.createTestingModule({
      providers: [AuthorizeRequestBuilder],
    }).compile();

    station = new Station();

    authorizeRequestBuilder = testModule.get<AuthorizeRequestBuilder>(AuthorizeRequestBuilder);
  });
  it('test build with data from payload', () => {
    const payload = {
      idTag: 'ABCD',
    };
    const request = authorizeRequestBuilder.build(station, payload);

    expect(request.idTag).toEqual(payload.idTag);
  });

  test('getOperationName method', () => {
    const builder = new AuthorizeRequestBuilder();
    expect(builder.getOperationName()).toStrictEqual('Authorize');
  });
});
