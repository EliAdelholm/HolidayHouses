import {Component, OnDestroy, OnInit} from '@angular/core';
import {LoginService} from './services/login/login.service';
import {AppActions} from './redux/app.actions';
import {Subscription} from 'rxjs/Subscription';
import {NgRedux} from '@angular-redux/store';
import {IAppState} from './redux/store/store';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit, OnDestroy {
  subscription: Subscription;
  user;

  constructor(public loginService: LoginService, private appActions: AppActions, private ngRedux: NgRedux<IAppState>) {
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  ngOnInit() {
    this.appActions.getHouses();
    if (this.loginService.isLoggedIn) {
      this.appActions.getUserHouses(Number(localStorage.getItem('login')));
    }

    this.subscription = this.ngRedux.select(store => store.user).subscribe(user => {
      this.user = user.account;

      if (this.loginService.isLoggedIn && !this.user) {
        this.appActions.getUser(localStorage.getItem('login'));
      }
    });
  }
}
