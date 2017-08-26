import React from 'react';
import SavedTrip from './savedTrip.jsx';

class SavedTrips extends React.Component {
  render() {
      return (
        <div>
          <a href ="#" ><h3 className = "glyphicon glyphicon-heart save"></h3></a>
          <div>
          <button onClick ={this.props.save}><a href="/auth/facebook">Save Trip</a></button></div>    
          {this.props.trips.map((trip,index) => (
            <SavedTrip trip={trip} key = {index} index = {index} remove = {this.props.remove}/>
          ))}
        </div>
      )
  }
}

export default SavedTrips;
