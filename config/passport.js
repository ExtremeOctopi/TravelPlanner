var FacebookStrategy = require('passport-facebook').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
const passport = require('passport'); 
var configAuth = require('./auth');
var db = require('../database-mongo');


var facebookId = 0;

module.exports.init = function(req, res, next) {
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    db.findUser(id, function(err, user) {
      done(err, user);
    });
  });

  passport.use(new FacebookStrategy({  
    clientID: process.env.CLIENT_ID || configAuth.facebookAuth.clientID,
    clientSecret: process.env.CLIENT_SECRET || configAuth.facebookAuth.clientSecret,
    callbackURL: process.env.CALLBACK_URL || configAuth.facebookAuth.callbackURL,
    profileFields: ['id', 'email', 'first_name', 'last_name'],
    enableProof: true
  },

  function(token, refreshToken, profile, done) {
    facebookId = profile.id;

    process.nextTick(function() {
      db.saveUser(token, refreshToken, profile, function(data) {
        done(null, data);
      });
      done(null, profile)
    });
  }));

  next();
};

module.exports.getId = facebookId;