const mongoose = require('mongoose');

module.exports = function (req, res, next) {
  if(!mongoose.Types.ObjectId.isValid(req.params.id)){ // Need to check for id validity, otherwise a 500 status will be returned to the client
    return res.status(404).send('Invalid ID');
  }
  next();
}