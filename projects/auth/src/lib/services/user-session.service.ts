import { Injectable } from '@angular/core';
import { UamEnvironmentService } from './uam-environment.service';

export interface SessionDetails{
	access_token: string,
	id_token: string,
	scope: string,
	expires_in: number,
	token_type: string
}


@Injectable({
	providedIn: 'root'
})
export class UserSessionService {
	
	constructor( private _uamEnvironmentService: UamEnvironmentService) { 
	}

	async isSessionActive(): Promise<boolean>{
		await this._uamEnvironmentService.whenLoaded();
		//go to session storage for accessToken/idToken
		let accessToken = window.sessionStorage.getItem(`${this._uamEnvironmentService.apiUrl}access_token`);
		let idToken = window.sessionStorage.getItem(`${this._uamEnvironmentService.apiUrl}id_token`);
		if(accessToken && idToken){
			//TODO need to validate that these tokens have not expired
			return true;
		}
		// No active session so we need to start the login process
		else {
			return false;
		}
	}

	async getSessionDetails(): Promise<SessionDetails>{
		await this._uamEnvironmentService.whenLoaded();
		if(this.isSessionActive()){
			return {
				access_token: window.sessionStorage.getItem(`${this._uamEnvironmentService.apiUrl}access_token`),
				id_token: window.sessionStorage.getItem(`${this._uamEnvironmentService.apiUrl}id_token`),
				scope: window.sessionStorage.getItem(`${this._uamEnvironmentService.apiUrl}scope`),
				expires_in: Number(window.sessionStorage.getItem(`${this._uamEnvironmentService.apiUrl}expires_in`)),
				token_type: window.sessionStorage.getItem(`${this._uamEnvironmentService.apiUrl}token_type`)
			}
		}
		else{
			return null;
		}
	}

	async setSessionDetails(details: SessionDetails): Promise<any>{
		await this._uamEnvironmentService.whenLoaded();
		// Store response in sessionStorage
		window.sessionStorage.setItem(`${this._uamEnvironmentService.apiUrl}access_token`,details.access_token);
		window.sessionStorage.setItem(`${this._uamEnvironmentService.apiUrl}id_token`,details.id_token);
		window.sessionStorage.setItem(`${this._uamEnvironmentService.apiUrl}scope`,details.scope);
		window.sessionStorage.setItem(`${this._uamEnvironmentService.apiUrl}expires_in`,details.expires_in.toString());
		window.sessionStorage.setItem(`${this._uamEnvironmentService.apiUrl}token_type`,details.token_type);
	}
}