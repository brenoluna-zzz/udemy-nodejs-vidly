const validate = require('../middleware/validate');
const moment = require('moment');
const auth = require('../middleware/auth');
const express = require('express');
const router = express.Router();
const {Rental} = require('../models/rental');
const {Movie} = require('../models/movie');
const Joi = require('joi');

router.post('/', [auth, validate(validateReturn)], async (req, res) => {

  const rental = await Rental.findOne({
    'customer._id': req.body.customerId,
    'movie._id': req.body.movieId });
  if(!rental) return res.status(404).send('Rental not found');
  if(rental.dateReturned != undefined) return res.status(400).send('Rental already returned');
  
  // set return date
  rental.dateReturned = new Date(); //now
  //await rental.save();

  //checks whether user is Gold and calculates fee
  const rentalDays = moment().diff(rental.dateOut, 'days');
  rental.rentalFee = rentalDays*rental.movie.dailyRentalRate*(rental.customer.isGold ? 0.9 : 1);
  await rental.save();

  //updates the movie stock
  await Movie.update({ _id: rental.movie._id }, {
    $inc: { numberInStock: 1 }
  });

  res.send(rental); 
});

function validateReturn(req) {
  const schema = {
    customerId: Joi.objectId().required(),
    movieId: Joi.objectId().required()
  };

  return Joi.validate(req, schema);
}

module.exports = router;