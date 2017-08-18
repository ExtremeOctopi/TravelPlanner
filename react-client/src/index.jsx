import React from 'react';
import ReactDOM from 'react-dom';
import $ from 'jquery';
import Hotels from './components/hotels.jsx'
import Flights from './components/Flights.jsx';
import config from '../../config.js';
import SearchBar from './components/SearchBar.jsx';
import Attraction from './components/Attraction.jsx';
import FoodList from './components/FoodList.jsx';
import Weather from './components/Weather.jsx';
import SavedTrips from './components/savedTrips.jsx';
const FlightAPI = require('qpx-express');


class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      departureLocation: 'San Francisco', // depart SF
      arrivalLocation: 'London', // arrive London
      departureDate: '2017-12-01', // depart SF on 2017-12-01 YYYY-MM-DD
      arrivalDate: '2017-12-02', // arrive London on 12/2/17
      returnDate: '2017-12-15', // return to SF on 12/15/17
      addresses:[ // array of addresses of ALL QUERIED hotel, attractions, & restaurants
        {category: 'hotel', name: 'London Hilton on Park Lane', address: '22 Park Ln, Mayfair, London W1K 1BE, UK'},
        {category: 'restaurant', name: 'Dinner by Heston Blumenthal', address: '66 Knightsbridge, London SW1X 7LA, UK'},
        {category: 'restaurant', name: 'Nobu London', address: 'Metropolitan by COMO, 19 Old Park Ln, Mayfair, London W1K 1LB, UK'}
      ],

      flights: [],

      savedChoices: [{
        flights: {},
        hotel: {},
        attractions: [],
        food: [],
        weather: {}
      }],

      airportCodes: {},
      savedTrips: [],

      attrItems: [],

      airportCodes: {},

      hotels: [],
      foodList: [],
      weather:[],
      weatherIcon: ''
    }

    this.onSearch = this.onSearch.bind(this);
    this.responseToSaveAddress = this.responseToSaveAddress.bind(this);
    this.requestWeather = this.requestWeather.bind(this);

  }

  hotelsSearch() {
     $.ajax({
      url: '/hotels',
      method: 'GET',
      data: {city: this.state.arrivalLocation},
      success: (res) => {

        const parsedHotel = JSON.parse( res );

        const addHotelAddress = this.state.addresses
        .concat( parsedHotel.map( this.responseToSaveAddress( 'hotel' ) ) );

        this.setState({
          hotels: parsedHotel,
          addresses: addHotelAddress
        });
      },
      error: (err) => {
        console.log('error !')
      }
     })
  }

  handleHotelClick(hotel, event){
    console.log(hotel.url);

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
   // console.log(this.state.savedChoices)
    }
  }

  retrieveFlights(departureDate, returnDate, depLocation, arrLocation) {
    var apiKey = process.env.QPX_API || config.flights;
    var qpx = new FlightAPI(apiKey);

    var body = {
      "request": {
        "passengers": { "adultCount": 1 },
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
    qpx.getInfo(body, function(error, data){
      context.setState({
        flights: data.trips.tripOption
      })
    });
  }

  getAirportCodes(departLoc, arrivalLoc) {
    var context = this;
    var codes = {};
    var APCAuth = process.env.APCAuth || config.APCAuth;
    var APCSecret = process.env.APCSecret || config.APCSecret;
    fetch(`https://www.air-port-codes.com/api/v1/multi?term=${departLoc}`, {
      headers: {
        Accept: "application/json",
        "APC-Auth": APCAuth,
        "APC-Auth-Secret": APCSecret
      },
      method: "POST"
    })
    .then((resp) => resp.json())
    .then(function(data) {
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
      .then(function(data) {
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
        });

      })
      .then(() => {
        context.retrieveFlights(context.state.departureDate, context.state.returnDate, codes.departLoc, codes.arrivalLoc);
      });
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
        saletotal: '$' + flight.saleTotal.slice(3),
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
  }

  onSearch (departureLocation, arrivalLocation, departureDate, returnDate) {
    console.log('the departure location is: ', departureLocation);
    console.log('the arrival location is: ', arrivalLocation);
    console.log('the departure date is: ', departureDate);
    console.log('the return date is: ', returnDate);
    this.removeClass('flightHighlight');
    this.removeClass('hotelHighlight');
    this.setState({
      departureLocation: departureLocation,
      arrivalLocation: arrivalLocation,
      departureDate: departureDate,
      returnDate: returnDate,
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
    },function(){
      this.yelpAttrSearch();
      this.searchFood();
      this.getAirportCodes(departureLocation, arrivalLocation);
      this.hotelsSearch(arrivalLocation);
      this.requestWeather(arrivalLocation, departureDate);
    });
  }


   yelpAttrSearch(){
    console.log(this.state.arrivalLocation);
    $.ajax({
      url: '/attraction',
      type: 'POST',
      data: { location: this.state.arrivalLocation },
      success: (res) => {

        const parsedAttr = JSON.parse( res );
        console.log(parsedAttr[0]);

        const addAttrAddress = this.state.addresses
        .concat( parsedAttr.map( this.responseToSaveAddress( 'attraction' ) ) );

        this.setState({
          attrItems: parsedAttr,
          addresses: addAttrAddress

        });
      },
      error: function(data) {
      }
    })
  }




  searchFood(){
    $.ajax({
      url:'/food',
      data: { location: this.state.arrivalLocation },
      type: 'POST',
      success:(res) => {

          const parsedFood = JSON.parse( res );
          console.log(parsedFood[0]);

          const addFoodAddress = this.state.addresses
          .concat( parsedFood.map( this.responseToSaveAddress( 'food' ) ) );

          this.setState({
            foodList: parsedFood,
            addresses: addFoodAddress
          });
      },

      error: (err) => {
        console.log('err', err);
      }
    })
  }


  SaveToDatabase(){
    var app = this;
    $.ajax({
      url: '/save',
      method: 'post',
      data: {data: JSON.stringify(this.state.savedChoices[0])},
      success: (data) =>{
        $.ajax({
          url: '/getAll',
          method: 'GET',
          success: (data) => {
            console.log(JSON.parse(data));
            app.setState({
              savedTrips: JSON.parse(data)
            })
          },
          error: (data) => {
            console.log(data);
          }
        })
      },

      error: (err) => {
        console.log(err);
      }
    })
  }

  responseToSaveAddress( category ){
    return function( {name, location, coordinates} ){
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
    var context = this;
    $.ajax({
      method: "POST",
      url: "/weather",
      data: {location: city, date: date},
      success: function(data) {
        var parsedData = JSON.parse(data);
        context.setState({
          weather: [parsedData],
          weatherIcon: parsedData.icon
        })
      },
      error: function(err) {
          console.log('error in requesting data.')
      }
    })
  }

  handleAttrItemState(e){
    this.updateSavedChoices( 'attractions', e.props.attrItemEntry, e.state.selected );
  }

  handleFoodItemState(e){
    this.updateSavedChoices( 'food', e.props.fooditem, e.state.selected );
  }

  updateSavedChoices( categoryName, itemData, selected ){
    let list = this.state.savedChoices[0][ categoryName ];
    if( list === undefined ){
      return;
    }

    var selectItem = {};

    if( selected ){
      selectItem.name = itemData.name;
      selectItem.address = itemData.location.display_address.join(', ');
      selectItem.price = itemData.price;
      selectItem.image_url = itemData. image_url;
      selectItem.category = itemData.categories[0].title;

      list.push( selectItem );
    }
    else{
      let index = list.indexOf( selectItem );
      if( index >= 0 ){
        list.splice( index, 1 );
      }
    }

    this.state.savedChoices[0][ categoryName ] = list;
  }


  render () {
    return (
      <div>

        <h1 id='title'>Trip Planner</h1>
          <span><SearchBar onSearch = {this.onSearch}/></span>
          <button onClick={this.SaveToDatabase.bind(this)}>save</button>
          <span><Weather information = {this.state.weather} icon = {this.state.weatherIcon}/></span>

        <table className='table'>
          <thead>
            <tr>
              <th>Flights</th>
              <th>Lodging</th>
              <th>Attractions</th>
              <th>Restaurants</th>
              <th>Saved</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <Flights handleFlightClick={this.handleFlightClick.bind(this)} flights={this.state.flights}/>
              </td>
              <td>
                <Hotels handleHotelClick={this.handleHotelClick.bind(this)} hotels = {this.state.hotels} />
              </td>
              <td>
                <Attraction attrItems = {this.state.attrItems} handleAttrItemState = {this.handleAttrItemState.bind(this)} />
              </td>
              <td>
                <FoodList foodlist = {this.state.foodList} handleFoodItemState = {this.handleFoodItemState.bind(this)} />
              </td>
              <td>
                <SavedTrips trips={this.state.savedTrips}/>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }
}


ReactDOM.render(<App />, document.getElementById('app'));

ReactDOM.render(<App />, document.getElementById('app'));

//<SearchBar onSearch = {this.onSearch}/>
//<Weather information = {this.state.weather} icon = {this.state.weatherIcon}/>

