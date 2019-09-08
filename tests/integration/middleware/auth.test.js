const request = require('supertest');
const {User} = require('../../../models/user');
//require('../../../index');

let token;
let name;
let server;

describe('auth middleware', () => {

  // Utility functions to open and close the server after each test script
  beforeEach(() => {
    server = require('../../../index');
  });
  afterEach(async () => { 
    server.close();
    //await Genre.remove({});
  });

  // using "mosh's technique"
  const exec = async () => {
    return await request(server) // directly returning a promise to be awaited when called
      .post('/api/genres')
      .set('x-auth-token', token)
      .send({ name });
  };

  beforeEach(() => {
    token = new User().generateAuthToken();
    name = 'genre1';    
  });

  it('should return 401 if no token is provided', async () => {
    token = '';

    const res = await exec();

    expect(res.status).toBe(401);
  });
});