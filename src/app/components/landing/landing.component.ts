import { Component, OnInit } from '@angular/core';
import { UserSessionService, UamEnvironmentService } from '@monstermakes/auth';
import { HttpClient } from '@angular/common/http';

@Component({
	selector: 'lry-landing',
	templateUrl: './landing.component.html',
	styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit {
	_sessionValid: boolean;
	__response: any;
	__error: any;
	constructor(private _userSession: UserSessionService, private _uamEnvironmentService: UamEnvironmentService, private _httpObj: HttpClient) { }

	async ngOnInit() {
		const sessionDetails = await this._userSession.getSessionDetails();
		if (sessionDetails) {
			this._sessionValid = true;
		}
	}

	checkHealth() {
		this.__error = this.__response = undefined;
		return this._httpObj
			.get(this._uamEnvironmentService.apiUrl + 'health-check')
			.toPromise()
			.then((data) => {
				this.__response = data;
			})
			.catch(err => {
				this.__error = err;
			});
	}

}
