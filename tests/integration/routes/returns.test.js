// POST /api/returns {customerId, movieId}
const {Rental} = require('../../../models/rental');
const {User} = require('../../../models/user');
const {Movie} = require('../../../models/movie');
const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');

describe('/api/returns', () => {
  let server, customerId, movieId, rental, movie, token;

  beforeEach(async () => {
    server = require('../../../index');

    token = new User().generateAuthToken();
    customerId = mongoose.Types.ObjectId();
    movieId = mongoose.Types.ObjectId();

    movie = new Movie({
      _id: movieId,
      title: '12345',
      dailyRentalRate: 2, // Could be refactored into a separate constant since it's used in multiple places
      genre: { name: '12345' },
      numberInStock: 10
    });
    await movie.save();

    rental = new Rental({
      customer: {
        _id: customerId, 
        name: '12345',
        phone: '12345'
      },
      movie: {
        _id: movieId,
        title: '12345',
        dailyRentalRate: 2
      }
    });
    await rental.save();
  });
  afterEach(async () => {
    await Rental.remove({});
    await Movie.remove({});
    await server.close();
  });

  // Happy path function
  const exec = () => {
    return request(server)
    .post('/api/returns')
    .set('x-auth-token', token)
    .send({customerId,movieId});
  };

  // Sanity test for suite
  // it('should work', async () => {
  //   const result = await Rental.findById(rental._id);
  //   expect(result).not.toBeNull();
  // });

// Return 401 if client in not logged in
  it('should return 401 if client in not logged in', async () => {
    token = '';
    
    const res = await exec();

    expect(res.status).toBe(401);
  });

// Return 400 if customerId is not provided
  it('should return 400 if customerId is not provided', async () => {
    customerId = undefined;
    
    const res = await exec();

    expect(res.status).toBe(400);
  });

// Return 400 if movieId is not provided
  it('should return 400 if movieId is not provided', async () => {
    movieId = undefined;
    
    const res = await exec();

    expect(res.status).toBe(400);
  });

// Return 404 if no rental is not found for the customer and movie
  it('should return 404 if no rental is not found for the customer and movie', async () => {
    customerId = mongoose.Types.ObjectId();
    movieId = mongoose.Types.ObjectId();
    //await Rental.remove({});

    const res = await exec();

    expect(res.status).toBe(404);
  });

// Return 400 if the rental has already been processed. I.e. returnDate is set
  it('should return 400 if the rental has already been processed', async () => {
    rental.dateReturned = new Date();
    await rental.save();

    const res = await exec();

    expect(res.status).toBe(400);
  });

// Return 200 if the request is valid
  it('should return 200 if the request is valid', async () => {
    const res = await exec();

    expect(res.status).toBe(200);
  });

// Set the return date
  it('should set the return date if input is valid', async () => {
    const res = await exec();

    const rentalInDb = await Rental.findById(rental._id);
    const diff = new Date() - rentalInDb.dateReturned;
    expect(diff).toBeLessThan(10*1000); //less than 10 sec
  });

// Calculate the rental fee for a non-Gold client
  it('should calculate the rental fee for a non-Gold client', async () => {
    rental.dateOut = moment().add(-7, 'days').toDate();
    rental.customer.isGold = false;
    await rental.save();
    
    const res = await exec();

    //const rentalInDb = await Rental.findById(rental._id);
    expect(res.body.rentalFee).toBe(14);
  });

// Calculate the rental fee for a Gold client
  it('should calculate the rental fee for a Gold client', async () => {
    rental.dateOut = moment().add(-7, 'days').toDate();
    rental.customer.isGold = true;
    await rental.save()
    
    const res = await exec();

    //const rentalInDb = await Rental.findById(rental._id);
    expect(res.body.rentalFee).toBe(12.6);
  });

// Increase the stock
  it('should increase the stock of the returned movie', async () => {
    await exec();

    const movieInDb = await Movie.findById(movieId);
    expect(movieInDb.numberInStock).toBe(movie.numberInStock + 1);
  });

// Return the proper rental object
  it('should increase the stock of the returned movie', async () => {
    const res = await exec();

    const rentalInDb = Rental.findById(rental._id);
    //expect(res.body).toMatchObject(rental);
    // The statement above fails as date type is returned as string
    // Use property checking instead (below)
    // expect(res.body).toHaveProperty('dateOut');
    // expect(res.body).toHaveProperty('dateReturned');
    // expect(res.body).toHaveProperty('rentalFee');
    // expect(res.body).toHaveProperty('customer');
    // expect(res.body).toHaveProperty('movie');

    //comparison of arrays for simplicity
    expect(Object.keys(res.body)).toEqual(
      expect.arrayContaining(['dateOut','dateReturned','rentalFee','customer','movie'])
    );
  });
});