import { Component, OnInit } from '@angular/core';
import { UserSessionService } from '@monstermakes/auth';

@Component({
  selector: 'lry-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit {
	_sessionValid: boolean;
  constructor(private _userSession: UserSessionService) { }

  async ngOnInit() {
	const sessionDetails = await this._userSession.getSessionDetails();
	if(sessionDetails){
		this._sessionValid = true;
	}
  }

}
