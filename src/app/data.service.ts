import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { BehaviorSubject, Subject } from "rxjs";
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  private currentData = new BehaviorSubject({});
  public showCurrentData = this.currentData.asObservable();
  // using asObservable() hides the data stream from components, preventing them from using .next(),
  // ensuring data is controlled from only this service

  // Default values for when no lat / long values are found - central london
  public defaultLat: number = 51.50749;
  public defaultLng: number = 0.1272;

  constructor(private http: HttpClient) { }



  updateData(year: number, lat: number, long: number) {
    let updatedData = this.http
      .get(`https://data.police.uk/api/crimes-at-location?date=${year}-02&lat=${lat}&lng=${long}`).subscribe(res => {
        this.currentData.next(res);
      }, error => { // If non recognised location - revert back to default values
        let updatedData = this.http
          .get(`https://data.police.uk/api/crimes-at-location?date=${year}-02&lat=${this.defaultLat}&lng=${this.defaultLng}`)
          .subscribe(res => {
            this.currentData.next(res);
          })
      });
  }

}

