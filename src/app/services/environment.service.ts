import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class EnvironmentService {

	private _environmentDetails: any;

	constructor(private _httpObj: HttpClient) { }

	load(): Promise<any> {
		this._environmentDetails = null;

		// pickup the env details from the REST API or local if not found in the API
		const apiUrl = location.protocol + '//api.' + location.hostname + '/environment/details';
		const localUrl = '/environment-details.json';


		return this._httpObj
			.get(apiUrl)
			.toPromise()
			.catch(err => {
				console.log(`Failed to load Environment Details from (${apiUrl}), loading them from (${localUrl}) instead.`);
				return this._httpObj
					.get(localUrl)
					.toPromise();
			})
			.then((data: any) => {
				this._environmentDetails = data;
			})
			.catch((err: any) => {
				console.error(`Failed to load Environment Details from (${apiUrl}) and from (${localUrl}), contact support.`);
				return Promise.reject(err);
			});
	}
	get environmentDetails(): any {
		return this._environmentDetails;
	}
	get baseUrl(): string {
		const baseUrl = location.protocol + '//' + location.host + '/';
		return baseUrl;
	}
	get apiUrl(): string {
		return this._environmentDetails.apiUrl;
	}
}
