import { Component, OnInit } from '@angular/core';
import { UserSessionService, UamEnvironmentService } from '@monstermakes/auth';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

@Component({
	selector: 'lry-landing',
	templateUrl: './landing.component.html',
	styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit {
	__sessionValid: boolean;
	__userInfo: any;
	__userRoles: any;
	__response: any;
	__error: any;
	
	constructor(
		private _userSession: UserSessionService, 
		private _uamEnvironmentService: UamEnvironmentService, 
		private _httpObj: HttpClient,
		private _currentRoute: ActivatedRoute
	) { }

	async ngOnInit() {
		const sessionDetails = await this._userSession.getSessionDetails();
		if (sessionDetails) {
			this.__sessionValid = true;
		}
		this.__userRoles = await this._userSession.getUserRoles();
		this.__userInfo = await this._userSession.getIdToken();
	}

	async checkHealth() {
		await this._uamEnvironmentService.whenLoaded();
		this.__error = this.__response = undefined;
		let url = this._uamEnvironmentService.apiUrl + 'example-private-scoped';
		return this._httpObj
			.get(url)
			.toPromise()
			.then((data) => {
				this.__response = data;
			})
			.catch(err => {
				this.__error = err;
			});
	}

}
