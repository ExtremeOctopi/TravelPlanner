var mongoose = require('mongoose');
var uristring = process.env.MONGODB_URI || 'mongodb://localhost/travelplanner';

mongoose.connect(uristring, function (err, res) {
  if (err) {
    console.log ('ERROR connecting to: ' + uristring + '. ' + err);
  } else {
    console.log ('Succeeded connected to: ' + uristring);
  }
});

var db = mongoose.connection;

db.on('error', function() {
  console.log('mongoose connection error');
});

db.once('open', function() {
  console.log('mongoose connected successfully');
});

var itemSchema = mongoose.Schema({
  flights: Object,
  hotel: Object,
  attractions: Array,
  food: Array,
  weather: Object,
  cost: Number
});

var userSchema = mongoose.Schema({  
  facebookid: String,
  token: String,
  email: String,
  firstname: String,
  lastname: String
});

var Item = mongoose.model('Item', itemSchema);
var User = mongoose.model('User', userSchema);

var saveUser = (token, refreshToken, profile, callback) => {

  User.findOne({'facebookid': profile.id}, (err, user) => {
    if (err) {
      return err;
    } 
    if (user) {
      return user
    } else {
      var newUser = new User();
      newUser.facebookid = profile.id;
      newUser.token = token;
      newUser.firstname = profile.name.givenName;
      newUser.lastname = profile.name.familyName;
      newUser.email = profile.emails[0].value
      newUser.save(err => {
        if (err) {
          console.log(err)
          return err;
        }
        console.log('SUCCESS SAVED')
        return newUser;
      });
    }
  });
}

var findUser = function(id, cb) {
  User.findOne({'facebookid': id}, (err, user) => {
    return cb(err, user);
  })
}

var saveToDatabase = function(data,callback) {
  Item.find({flights: data.flights, hotel: data.hotel, attractions: data.attractions, food: data.food, cost: data.cost}, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      if(result.length === 0) {
         var item = new Item;
         item.flights = data.flights;
         item.hotel = data.hotel;
         item.attractions = data.attractions;
         item.food = data.food;
         item.weather = data.weather;
         item.cost = data.cost;
         item.save(function(err, result) {
           if(err) {
             console.log('error saving to the db ', err);
             callback(err, null);
           } else {
             console.log('successfully saved a new record to the db ');
             callback(null, result);
           }
         })
      }
    }
  })
};

var deleteFromDatabase = function(id, callback){
  Item.remove({_id: id}, function(err){
     if(err) {
       return handleError(err);
     } else {
       console.log('deleted from db');
     }
  });
};


var selectAll = function(callback) {
  Item.find({}, function(err, items) {
    if(err) {
      callback(err, null);
    } else {
      console.log(items);
      callback(null, items);
    }
  });
};

module.exports.selectAll = selectAll;
module.exports.saveToDatabase =saveToDatabase;
module.exports.deleteFromDatabase =deleteFromDatabase;
module.exports.saveUser = saveUser;
module.exports.findUser = findUser;
