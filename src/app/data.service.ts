// Data service makes API Requests to get UK Police Crime data
// Fetched results are pushed to componenets via RxJS Observables
// This ensures all componenets recieved upto date data
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { forkJoin, of, Subject } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private currentData = new Subject(); // the current data varaible stores all of the current fetched crime data
  public showCurrentData = this.currentData.asObservable();
  // using asObservable() hides the data stream from components, preventing them from using .next(),
  // ensuring data is controlled from only this service

  // Default values for when no lat / long values are found - central london
  public userLat: number = 51.5014;
  public userLng: number = -0.1419;

  // loading boolean to control angular material loading bar in component templates
  isLoading: Subject<boolean> = new Subject<boolean>();

  constructor(private http: HttpClient) {}

  // Method is used to fetch updated data from UK Police API using user selected year and location
  updateData(year: number, lat: number, long: number) {
    this.isLoading.next(true); // Emit true value so that subscribed components can display loading
    // Update public variables ensuring one source of coordinates used throughout the app
    this.userLat = lat;
    this.userLng = long;
    const apiRequests = []; // Hold all of the api request - one for each month
    for (let i = 1; i < 13; i++) {
      // loop 12 times
      // Crimes at a specific location, to the nearest pre-defined location
      apiRequests.push(
        this.http
          .get(
            `https://data.police.uk/api/crimes-at-location?date=${year}-${i}&lat=${lat}&lng=${long}`
          )
          .pipe(catchError((error) => of(error)))
      ); // Any errors are handled with the rxjs CatchError operator.
      // This ensures the Observable chain is not broken if one request returns an error
    }
    let crimeList: any = [];
    let crimeListFiltered: any = [];
    let completedCrimeList: any = [];
    // ForkJoin is used to trigger all API calls at once, without having to wait for each to complete before the next
    forkJoin(apiRequests).subscribe((res) => {
      crimeList = res.filter((element) => element.constructor === Array); // remove error responses
      crimeListFiltered = crimeList.filter(
        (element) => element[0] !== undefined
      ); // remove null responses
      crimeListFiltered.forEach((crimeArray) => {
        // loop through each retreived crime array
        crimeArray.forEach((crime) => {
          // loop through each entry in each crime array, and push them into the one array
          completedCrimeList.push(crime); // We end up with one array holding all found crimes
        });
      });
      this.currentData.next(completedCrimeList); // Pass the crimes to the current Data method, emitting the data across
      // all subscribed componenets
      setTimeout(() => this.isLoading.next(false), 500); // half a second delay on removal of loading bar
    });
  }

  // Send string location to geocoding API to retrieve coordinates
  // Promise is used as code is asynchronous - we firstly make an api call, then resolve based on conditions
  doGeocoding(locationString: string): Promise<any> {
    let correctedString = locationString.split(' ').join('%20'); // API uses %20 as spaces
    correctedString = correctedString.split('+').join('%20'); // API uses %20 as spaces not '+'
    correctedString = correctedString.split(',').join('%20'); // API uses %20 and doesnt recognise commas between street names etc
    return new Promise((resolve, reject) => {
      this.http // Make API request to OSM geocoding API, returning location coords
        .get(
          `https://nominatim.openstreetmap.org/?addressdetails=1&q=${correctedString}&format=json&limit=1`
        )
        .toPromise() // Return a promise instead of an Observable
        .then(
          (res: any) => {
            // If found coordinates - return first array element returned from the API as the location coordinates
            if (res.length >= 1) {
              resolve(res);
            } else {
              // If didnt find any coordinates, reject promise. This will be caught and handled in search component
              reject();
            }
          },
          (err) => {
            // Error - just send an empty array
            reject();
          }
        );
    });
  }
}
