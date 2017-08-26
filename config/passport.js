var FacebookStrategy = require('passport-facebook').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;  
var configAuth = require('./auth');
var db = require('../database-mongo');


var facebookId = 0;

module.exports.init = function(passport) {

  passport.serializeUser(function(user, done) {
    console.log('is this working');
    done(null, user.id);
  });
  passport.deserializeUser(function(id, done) {
    console.log('this is not working correctly', id);
    db.findUser(id, function(err, user) {
      done(err, user);
    });
  });

  passport.use(new FacebookStrategy({  
    clientID: configAuth.facebookAuth.clientID,
    clientSecret: configAuth.facebookAuth.clientSecret,
    callbackURL: configAuth.facebookAuth.callbackURL,
    profileFields: ['id', 'email', 'first_name', 'last_name'],
    enableProof: true
  },

  function(token, refreshToken, profile, done) {
    console.log('profile', profile);
    facebookId = profile.id;
    process.nextTick(function() {
      db.saveUser(token, refreshToken, profile, function(data) {
        return done(null, data);
        next();
      });
      return done(null, profile)
    });
  }));
};

module.exports.getId = facebookId;