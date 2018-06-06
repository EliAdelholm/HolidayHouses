import {Injectable} from '@angular/core';
import {House} from '../entities/house';
import {User} from '../entities/user';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class AppService {

  constructor(private http: HttpClient) {
  }

  // houses services
  getHouses() {
    console.log('getting houses');
    return this.http.get('/api/get-houses?number=50');
  }

  createHouse(house: House) {
    return this.http.post('/api/create-house', house);
  }

  // users services
  getUser(formData: object) {
    return this.http.post('/api/login', formData);
  }

  createUser( payload: User ): Observable<any> {
    const result = this.http.post('/api/create-user', payload);
    return result;
  }

}
