const express = require('express');
const bodyParser = require('body-parser');
const db = require('../database-mongo');
const request = require('request');
const app = express();
const hotel = require('./hotel/hotel');
const yelpattr = require('./yelpattraction/yelpattraction');
const yelpfood = require('./yelpfood/yelpfood');
const weather = require('./weatherAPI/weather.js');
const geolocation = require('./geolocationAPI/geolocation.js');
const passport = require('passport');
const session = require('express-session');

app.use(express.static(__dirname + '/../react-client/dist'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({secret: 'something', resave: true, saveUninitialized: true }));

app.use(passport.initialize());
app.use(passport.session());


require('../config/passport')(passport);

app.get('/getAll', (req, res) => {
  db.selectAll(function(err, result) {
    if(err) {
      console.log('server received database error when retrieving records');
    } else {
      res.send(result);
    }
  })
});

app.get('/auth/facebook', passport.authenticate('facebook', {authType: 'rerequest'}, { scope: ['user_friends','email']}));

app.get('/auth/facebook/callback', passport.authenticate('facebook', {
  successRedirect: '/',
  failureRedirect: '/',
}), (req, res) => {
  console.log('inside facebook server', req.session)
});


app.post('/attraction', function(req,res){
  const attrLocation = req.body.location;
  yelpattr.searchAttr(attrLocation, function(attrResult){
    res.send(200, JSON.stringify(attrResult));
  })
});

app.get( '/hotels', ( req, res ) => {
  hotel.hotel( req.query.location, req.query.rating, req.query.price, ( data ) => {
    res.end( JSON.stringify( data ) )
  } )
} );

app.post( '/food', function ( req, res ){
  yelpfood.searchFood( req.body.location, req.body.rating, req.body.price, function( foodresult ) {
    res.send( 200, JSON.stringify( foodresult ) );
  } );
} );

app.post('/weather', function(req,res) {
  geolocation.requestGeolocation(req.body['location'], function(data){
    geoCode = data.results[0].geometry.location;
    weather.requestWeather(geoCode, req.body['date'], function(data) {
      var parsedData = JSON.parse(data);
      var minTemp = parsedData.daily.data[0].temperatureMin;
      var maxTemp = parsedData.daily.data[0].temperatureMax;
      var averageTemp = ((minTemp + maxTemp) / 2).toFixed(2);
      res.send(JSON.stringify({'averageTemp': averageTemp, 'description': parsedData.daily.data[0].summary, 'icon': parsedData.daily.data[0].icon}));
    });
  });
});

app.post('/save', (req, res) => {
  var data = JSON.parse(req.body.data);
  db.saveToDatabase(data, function(err, result) {
    if(err) {
      console.log('server received database error when saving a record');
    } else {
      res.sendStatus(200);
    }
  })
});


app.post('/removeRecord', (req, res) => {
   var id = req.body.uniqueID;
   db.deleteFromDatabase(id);
   res.sendStatus(200);
});

var port = process.env.PORT || 8080;



app.listen(port, function() {
  console.log(`listening on port ${port}`);
});