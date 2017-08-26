const yelpConfig = require('../../config/auth.js');
const yelp = require( 'yelp-fusion' );

var hotel = function ( location, rating, price, callback ){
  const yelpKey = process.env.HOTEL_API || yelpConfig.hotelkey;
  const client = yelp.client( yelpKey );

  var options = {
    location: location,
    term:'hotels',
    limit: 12,
    rating: 'rating'
  };

  if ( rating === 'true' ) {
    client.search( options ).then( ( response ) => callback( response.jsonBody.businesses ) );
  } else {
    options.price = price;

    client.search( options ).then( ( response ) => callback( response.jsonBody.businesses ) );
  }
};

module.exports.hotel = hotel;
