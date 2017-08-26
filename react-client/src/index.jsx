import React from 'react';
import ReactDOM from 'react-dom';
import $ from 'jquery';
import Hotels from './components/hotels.jsx'
import Flights from './components/Flights.jsx';
import config from '../../config/auth.js';
import SearchBar from './components/SearchBar.jsx';
import Attraction from './components/Attraction.jsx';
import FoodList from './components/FoodList.jsx';
import Weather from './components/Weather.jsx';
import SavedTrips from './components/savedTrips.jsx';
import BudgetBar from './components/BudgetBar.jsx';
import BudgetFloat from './components/BudgetFloat.jsx';
const FlightAPI = require('qpx-express');


class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: '',
      departureLocation: '',
      arrivalLocation: '',
      departureDate: '',
      arrivalDate: '',
      returnDate: '',
      addresses: [
        {category: 'hotel', name: 'London Hilton on Park Lane', address: '22 Park Ln, Mayfair, London W1K 1BE, UK'},
        {category: 'restaurant', name: 'Dinner by Heston Blumenthal', address: '66 Knightsbridge, London SW1X 7LA, UK'},
        {
          category: 'restaurant',
          name: 'Nobu London',
          address: 'Metropolitan by COMO, 19 Old Park Ln, Mayfair, London W1K 1LB, UK'
        }
      ],
      flights: [],
      savedChoices: [{
        flights: {},
        hotel: {},
        attractions: [],
        food: [],
        weather: {},
        cost: 0
      }],
      airportCodes: {},
      savedTrips: [],
      attrItems: [],
      hotels: [],
      foodList: [],
      weather: [],
      weatherIcon: '',
      budget: '$',
      exchange: {},
      max: 0,
      flightTime: true,
      hotelRating: true,
      hotelPrice: 1,
      foodRating: true,
      foodPrice: 1,
      nights: 0
    };

    this.expenses = 0;

    this.onSearch = this.onSearch.bind(this);
    this.responseToSaveAddress = this.responseToSaveAddress.bind(this);
    this.requestWeather = this.requestWeather.bind(this);
    this.removeSingleDatabaseRecord = this.removeSingleDatabaseRecord.bind(this);
    this.saveToDatabase = this.saveToDatabase.bind(this);
    this.retrieveFromDatabase = this.retrieveFromDatabase.bind(this);
    this.changeBudget = this.changeBudget.bind(this);
  }

  componentDidMount() {
    this.retrieveFromDatabase();
    $.get('http://apilayer.net/api/live?access_key=1413ee013898f6dc75d92fa9f5444d13 ', (res) => {
      this.setState({
        exchange: res.quotes
      })
    });
  }

  searchHotel() {
    if ( this.state.arrivalLocation ) {
      $.ajax( {
        method: 'GET',
        url: '/hotels',
        data: { 
          location: this.state.arrivalLocation,
          rating: this.state.hotelRating,
          price: this.state.hotelPrice
        },
        success: ( res ) => {
          console.log( 'SUCCESS: HOTELS' );

          const parsedHotel = JSON.parse( res );
          const addHotelAddress = this.state.addresses.concat( parsedHotel.map( this.responseToSaveAddress( 'hotel' ) ) );

          this.setState( {
            hotels: parsedHotel,
            addresses: addHotelAddress
          } );
        },
        error: ( err ) => {
          console.log('ERROR:', err );
        }
      } )
    }
  }

  handleHotelClick(hotel, event) {
    this.removeClass('hotelHighlight');
    if (this.state.selectedHotelId === hotel.id) {
      this.state.savedChoices[0].hotel = {};
      delete this.state.selectedHotelId;
    } else {
      this.setState({
        selectedHotelId: hotel.id
      });
      $(event.target).toggleClass('hotelHighlight');
      var saved = {
        name: hotel.name,
        address: hotel.location.display_address.join(', '),
        price: hotel.price,
        image_url: hotel.image_url
      };
      this.state.savedChoices[0].hotel = saved;
    }
    this.updateBudget();
  }

  changeBudget(e) {
    this.setState({
      max: e.target.value
    }, () => this.updateBudget());

  }

  updateBudget() {
    var flight = 0;
    if(this.state.savedChoices[0].flights.saletotal) {
      var exchange = this.state.savedChoices[0].flights.saletotal.slice(3) / this.state.exchange['USD' +
        this.state.savedChoices[0].flights.saletotal.slice(0,3)];
      flight = exchange;
    }

    var food = 0;

    var foodPrice = {1: 11, 2: 22, 3: 44, 4: 66};
    for(var i = 0; i < this.state.savedChoices[0].food.length; i++) {
      food += foodPrice[this.state.savedChoices[0].food[i].price.length];
    }

    console.log(this.state.savedChoices[0]);

    var hotel = 0;

    var hotelPrice = {1: 64, 2: 113, 3: 201, 4: 512};
    if(this.state.savedChoices[0].hotel.price) {
      hotel = hotelPrice[this.state.savedChoices[0].hotel.price.length] * this.state.nights;
    }

    var max = this.state.max || 0;
    if(max === '-'){
      max = 0;
    }

    var expenses = flight + food + hotel;
    this.state.savedChoices[0].cost = expenses;

    var total = Math.round(max - expenses);

    if(total >= 0) {
      $(".budgetfloat-wrapper").css("background", "rgba(7, 242, 219, .4)");
    } else {
      $(".budgetfloat-wrapper").css("background", "rgba(191, 54, 79, .4)");
    }

    var str = total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    str = '$' + str;

    this.setState({
      budget: str
    })
  }

  retrieveFlights(departureDate, returnDate, depLocation, arrLocation) {
    var apiKey = process.env.QPX_API || config.flights;
    var qpx = new FlightAPI(apiKey);

    var body = {
      "request": {
        "passengers": {"adultCount": 1},
        "slice": [{
          "origin": depLocation,
          "destination": arrLocation,
          "date": departureDate,
          "maxStops": 0
        },
          {
            "origin": arrLocation,
            "destination": depLocation,
            "date": returnDate, // YYYY-MM-DD
            "maxStops": 0
          }
        ],
        "solutions": 12,
      }
    };
    var context = this;
    qpx.getInfo(body, function (error, data) {
      console.log(data);
      context.setState({
        flights: data.trips.tripOption
      })
    });
  }

  getAirportCodes(departLoc, arrivalLoc) {
    var context = this;
    var codes = {};
    var APCAuth = process.env.APC_AUTH || config.APCAuth;
    var APCSecret = process.env.APC_SECRET || config.APCSecret;
    fetch(`https://www.air-port-codes.com/api/v1/multi?term=${departLoc}`, {
      headers: {
        Accept: "application/json",
        "APC-Auth": APCAuth,
        "APC-Auth-Secret": APCSecret
      },
      method: "POST"
    })
      .then((resp) => resp.json())
      .then(function (data) {
        if (data.airports[0].name.includes('All Airports')) {
          codes.departLoc = data.airports[1].iata;
        } else {
          codes.departLoc = data.airports[0].iata;
        }
      })
      .then(() => {
        fetch(`https://www.air-port-codes.com/api/v1/multi?term=${arrivalLoc}`, {
          headers: {
            Accept: "application/json",
            "APC-Auth": APCAuth,
            "APC-Auth-Secret": APCSecret
          },
          method: "POST"
        })
          .then((resp) => resp.json())
          .then(function (data) {
            if (data.airports[0].name.includes('All Airports')) {
              codes.arrivalLoc = data.airports[1].iata;
            } else {
              codes.arrivalLoc = data.airports[0].iata;
            }
          })
          .then((codes) => {
            context.setState({
              airportCodes: codes
            })
          })
          .then(() => {
            fetch(`https://www.air-port-codes.com/api/v1/multi?term=${arrivalLoc}`, {
              headers: {
                Accept: "application/json",
                "APC-Auth": APCAuth,
                "APC-Auth-Secret": APCSecret
              },
              method: "POST"
            })
              .then((resp) => resp.json())
              .then(function (data) {
                if (data.airports[0].name.includes('All Airports')) {
                  codes.arrivalLoc = data.airports[1].iata;
                } else {
                  codes.arrivalLoc = data.airports[0].iata;
                }
              })
              .then((codes) => {
                context.setState({
                  airportCodes: codes
                });
              })
              .then(() => {
                context.retrieveFlights(context.state.departureDate, context.state.returnDate, codes.departLoc, codes.arrivalLoc);
              });
          })
      });
  }

  removeClass(classname) {
    var elems = document.querySelectorAll(`.${classname}`);
    elems.forEach(ele => {
      ele.classList.remove(classname);
    });
  }

  handleFlightClick(flight, event) {
    this.removeClass('flightHighlight');
    if (this.state.selectedFlightId === flight.id) {
      this.state.savedChoices[0].flights = {};
      delete this.state.selectedFlightId;
    } else {
      this.setState({
        selectedFlightId: flight.id
      });
      $(event.target).toggleClass('flightHighlight');
      var flight1 = flight.slice[0];
      var flight2 = flight.slice[1];
      var saved = {
        saletotal: flight.saleTotal,
        goingDuration: flight1.duration,
        goingOrigin: flight1.segment[0].leg[0].origin,
        goingDestination: flight1.segment[0].leg[0].destination,
        goingArrivalTime: flight1.segment[0].leg[0].arrivalTime,
        goingCarrier: flight1.segment[0].flight.carrier,
        returnDuration: flight2.duration,
        returnOrigin: flight2.segment[0].leg[0].origin,
        returnDestination: flight2.segment[0].leg[0].destination,
        returnArrivalTime: flight2.segment[0].leg[0].arrivalTime,
        returnCarrier: flight2.segment[0].flight.carrier
      };
      this.state.savedChoices[0].flights = saved;
    }
    this.updateBudget();
  }

  onSearch(departureLocation, arrivalLocation, departureDate, returnDate) {
    console.log('the departure location is: ', departureLocation);
    console.log('the arrival location is: ', arrivalLocation);
    console.log('the departure date is: ', departureDate);
    console.log('the return date is: ', returnDate);
    console.log('number of nights are: ', (Date.parse(returnDate) - Date.parse(departureDate))/86400000);
    this.removeClass('flightHighlight');
    this.removeClass('hotelHighlight');
    this.setState({
      departureLocation: departureLocation,
      arrivalLocation: arrivalLocation,
      departureDate: departureDate,
      returnDate: returnDate,
      nights: (Date.parse(returnDate) - Date.parse(departureDate))/86400000,
      attrItems: [],
      foodList: [],
      addresses: [],
      savedChoices: [{
        flights: {},
        hotel: {},
        attractions: [],
        food: [],
        weather: {}
      }]
    }, function () {
      this.getAirportCodes(departureLocation, arrivalLocation);
      this.requestWeather(arrivalLocation, departureDate);
      this.searchHotel(arrivalLocation);
      this.yelpAttrSearch();
      this.searchFood();
    });
  }

  yelpAttrSearch() {
    $.ajax({
      url: '/attraction',
      type: 'POST',
      data: {location: this.state.arrivalLocation},
      success: (res) => {
        console.log( 'SUCCESS: ATTRACTIONS' );

        const parsedAttr = JSON.parse(res);

        const addAttrAddress = this.state.addresses
          .concat(parsedAttr.map(this.responseToSaveAddress('attraction')));

        this.setState({
          attrItems: parsedAttr,
          addresses: addAttrAddress

        });
      },
      error: function (data) {
      }
    })
  }

  searchFood() {
    if ( this.state.arrivalLocation ) {
      $.ajax( {
        type: 'POST',
        url: '/food',
        data: {
          location: this.state.arrivalLocation,
          rating: this.state.foodRating,
          price: this.state.foodPrice
        },
        success: ( res ) => {
          console.log( 'SUCESS: FOOD' );

          const parsedFood = JSON.parse( res );
          const addFoodAddress = this.state.addresses.concat( parsedFood.map( this.responseToSaveAddress( 'food' ) ) );

          this.setState( {
            foodList: parsedFood,
            addresses: addFoodAddress
          } );
        },
        error: ( err ) => {
          console.log( 'ERROR:', err );
        }
      } )
    }
  }

  saveToDatabase() {
    var app = this;
    $.ajax({
      url: '/save',
      method: 'post',
      data: {data: JSON.stringify(app.state.savedChoices[0])},
      success: (data) => {
        console.log(data)
        this.retrieveFromDatabase();
      },
      error: (err) => {
        console.log(err);
      }
    })
  }

  responseToSaveAddress(category) {
    return function ({name, location, coordinates}) {
      const display_address = location.display_address;

      return {
        category,
        name,
        address: display_address.join(', '),
        coordinates
      };
    }
  }

  requestWeather(city, date) {
    $.ajax({
      method: "POST",
      url: "/weather",
      data: {location: city, date: date},
      success: (data) => {
        console.log( 'SUCCESS: WEATHER' );

        var parsedData = JSON.parse(data);
        this.setState({
          weather: [parsedData],
          weatherIcon: parsedData.icon
        })
      },
      error: function (err) {
        console.log( 'ERROR:', err );
      }
    })
  }

  handleAttrItemState(e) {
    this.updateSavedChoices('attractions', e.props.attrItemEntry, e.state.selected);
  }

  handleFoodItemState(e) {
    this.updateSavedChoices('food', e.props.fooditem, e.state.selected);
  }

  updateSavedChoices(categoryName, itemData, selected) {
    let list = this.state.savedChoices[0][categoryName];
    if (list === undefined) {
      return;
    }

    var selectItem = {};

    if (selected) {
      selectItem.name = itemData.name;
      selectItem.address = itemData.location.display_address.join(', ');
      selectItem.price = itemData.price;
      selectItem.image_url = itemData.image_url;
      selectItem.category = itemData.categories[0].title;

      list.push(selectItem);
    }

    else {
      var index = -1;
      for(var i = 0; i < list.length; i++) {
        if(list[i].name === itemData.name) {
          index = i;
        }
      }

      if (index >= 0) {
        list.splice(index, 1);
      }
    }

    this.state.savedChoices[0][categoryName] = list;
    this.updateBudget();
  }

  retrieveFromDatabase() {
    var context = this;
    $.ajax({
      url: '/getAll',
      method: 'GET',
      success: (data) => {
        console.log(data);
        context.setState({
          savedTrips: data
        }, function () {
        })
      },
      error: () => {
        console.log("client - error in retrieving saved data from the database");
      }
    })
  }

  removeSingleDatabaseRecord(uniqueID) {
    var context = this;
    $.ajax({
      method: "POST",
      url: "/removeRecord",
      data: {uniqueID: uniqueID},
      success: () => {
        context.retrieveFromDatabase();
      }, error: function () {
        console.log('client received an error when attempting to remove from db');
      }
    })
  }

  sortFlightByTime() {
    if ( this.state.flights ) {
      this.setState( {
        flights: this.state.flights.sort( ( a, b ) => {
          var aTime = ( new Date( a.slice[0].segment[0].leg[0].departureTime ) ).getTime();
          var bTime = ( new Date( b.slice[0].segment[0].leg[0].departureTime ) ).getTime();

          if ( this.state.flightTime ) {
            return aTime < bTime;
          } else {
            return bTime < aTime;
          }
        } ),
        flightTime: !this.state.flightTime
      } );
    }
  }

  sortFlightByPrice() {
    if ( this.state.flights ) {
      this.setState( {
        flights: this.state.flights.reverse()
      } );
    }
  }

  sortHotelByRating() {
    this.setState( { hotelRating: !this.state.hotelRating }, () => {
      this.searchHotel();
    } );
  }

  sortHotelByPrice( event ) {
    this.setState( { hotelRating: false, hotelPrice: event.target.textContent.length }, () => {
      this.searchHotel();
    } );
  }

  sortFoodByRating() {
    this.setState( { foodRating: !this.state.foodRating }, () => {
      this.searchFood();
    } );
  }

  sortFoodByPrice( event ) {
    this.setState( { foodRating: false, foodPrice: event.target.textContent.length }, () => {
      this.searchFood();
    } );
  }

  render() {
    return (
      <div>
        <BudgetFloat budget={this.state.budget}/>
        <div className="container-fluid">
          <h1 id='title'>Navigato</h1>
          <div className="row">
            <div className="col-sm-2 weather-icon">
              <Weather information={this.state.weather} icon={this.state.weatherIcon}/>
            </div>
            <div className="col-sm-8">
              <SearchBar onSearch={this.onSearch}/>
            </div>
            <div className="col-sm-2">
              <BudgetBar changeBudget={this.changeBudget}/>
            </div>
          </div>

          <table className='table'>
            <thead>
            <tr>
              <th>Flights
                <button onClick={ this.sortFlightByTime.bind( this ) } className='glyphicon glyphicon-time' style={ { float: 'right' } }/>
                <button onClick={ this.sortFlightByPrice.bind( this ) } className='glyphicon glyphicon-usd' style={ { float: 'right' } }/>
                <div className="glyphicon glyphicon-sort-by-attributes-alt" style={ { float: 'right' } }>  </div>
              </th>
              <th>Lodging
                <button onClick={ this.sortHotelByRating.bind( this ) } className='glyphicon glyphicon-star' style={ { float: 'right' } }></button>
                <span className="dropdown">
                  <button className='glyphicon glyphicon-usd dropdown-toggle' data-toggle="dropdown" style={ { float: 'right' } }></button>
                  <ul className="dropdown-menu">
                    <li><a onClick={ this.sortHotelByPrice.bind( this ) }>$</a></li>
                    <li><a onClick={ this.sortHotelByPrice.bind( this ) }>$$</a></li>
                    <li><a onClick={ this.sortHotelByPrice.bind( this ) }>$$$</a></li>
                    <li><a onClick={ this.sortHotelByPrice.bind( this ) }>$$$$</a></li>
                  </ul>
                </span>
                <div className="glyphicon glyphicon-sort-by-attributes-alt" style={ { float: 'right' } }>  </div>
              </th>
              <th>Attractions</th>
              <th>Restaurants
                <button onClick={ this.sortFoodByRating.bind( this ) } className='glyphicon glyphicon-star' style={ { float: 'right' } }></button>
                <span className="dropdown">
                  <button className='glyphicon glyphicon-usd dropdown-toggle' data-toggle="dropdown" style={ { float: 'right' } }></button>
                  <ul className="dropdown-menu">
                    <li><a onClick={ this.sortFoodByPrice.bind( this ) }>$</a></li>
                    <li><a onClick={ this.sortFoodByPrice.bind( this ) }>$$</a></li>
                    <li><a onClick={ this.sortFoodByPrice.bind( this ) }>$$$</a></li>
                    <li><a onClick={ this.sortFoodByPrice.bind( this ) }>$$$$</a></li>
                  </ul>
                </span>
                <div className="glyphicon glyphicon-sort-by-attributes-alt" style={ { float: 'right' }}>  </div>
              </th>
              <th>Saved</th>
            </tr>
            </thead>
            <tbody>
            <tr>
              <td>
                <Flights handleFlightClick={this.handleFlightClick.bind(this)} exchange={this.state.exchange} flights={this.state.flights}/>
              </td>
              <td>
                <Hotels handleHotelClick={this.handleHotelClick.bind(this)} hotels={this.state.hotels}/>
              </td>
              <td>
                <Attraction attrItems={this.state.attrItems} handleAttrItemState={this.handleAttrItemState.bind(this)}/>
              </td>
              <td>
                <FoodList foodlist={this.state.foodList} handleFoodItemState={this.handleFoodItemState.bind(this)}/>
              </td>
              <td id="savedTrips">
                <SavedTrips trips={this.state.savedTrips} remove={this.removeSingleDatabaseRecord}
                            save={this.saveToDatabase}/>
              </td>
            </tr>
            </tbody>
          </table>

        </div>
      </div>
    )
  }
}

ReactDOM.render(<App />, document.getElementById('app'));