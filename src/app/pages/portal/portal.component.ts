import {Component, OnInit} from '@angular/core';
import {Subscription} from 'rxjs/Subscription';
import {NgRedux} from '@angular-redux/store';
import {IAppState} from '../../redux/store/store';
import {House} from '../../entities/house';
import {FilterHouseType} from '../../filters/filter.house-type';

@Component({
  selector: 'app-portal',
  templateUrl: './portal.component.html',
  styleUrls: ['./portal.component.scss'],
  providers: [FilterHouseType]
})
export class PortalComponent implements OnInit {
  subscription: Subscription;
  houses: House [];
  house: House;
  is_house: boolean;
  is_apartment: boolean;
  // filterItems: any[];

  constructor(
    private ngRedux: NgRedux<IAppState>
  ) {
  }

  ngOnInit() {
    this.subscription = this.ngRedux.select(store => store.houses).subscribe(houses => {
      this.houses = houses && houses;
      console.log('houses', this.houses);
    });
  }

  checked() {
    return this.houses.filter(item => { return item.hasWifi; });
  }


}
