import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UamEnvironmentDetails } from '../interfaces/environment-details.interface';
import * as _ from 'lodash';

const CACHE_KEY= `uam/environment/details`;
const CACHE_PERIOD_MIN = 30;

@Injectable({
	providedIn: 'root'
})
export class UamEnvironmentService {

	private _environmentDetails: UamEnvironmentDetails;
	private _loadingProm: Promise<UamEnvironmentDetails>;

	constructor(private _httpObj: HttpClient) { }

	/**
	 * Loads the environment details from the sever or the local cache if it has not expired.
	 */
	load(): Promise<UamEnvironmentDetails> {
		this._environmentDetails = null;

		// pickup the env details from the REST API or local if not found in the API
		const apiUrl = location.protocol + '//uam.' + location.hostname + '/environment/details';
		const localUrl = '/environment-details.json';
		
		this._loadingProm = Promise.resolve()
			// check if this request has been made within CACHE_PERIOD
			.then(()=>{
				let envDetails = null;
				let cache = window.sessionStorage.getItem(CACHE_KEY);
				try{
					envDetails = JSON.parse(cache);
					let cachedAt = envDetails.cachedAt;
					// check to see if CACHE_PERIOD has passed
					if(cachedAt){
						let currentTime = Date.now();
						let elapsedMs = currentTime-cachedAt;
						let elapsedMin = Math.ceil(elapsedMs / (1000*60));
						if(elapsedMin > CACHE_PERIOD_MIN){
							envDetails = null;
						}
					}
				}
				catch(e){
					//this is not something worth displaying as error... instead we will debug it so its not swallowed
					console.debug(`Failed to parse Environment Details from SessionStorage.${CACHE_KEY}.`,{valueInSessionStorage: cache});
				}
				return envDetails;
			})
			.then((cachedEnvDetails)=>{
				// previously cached use it
				if(cachedEnvDetails){
					return cachedEnvDetails;
				}
				// not cached go retrieve it
				else{
					return this._httpObj
						.get(apiUrl)
						.toPromise()
						.catch(err => {
							console.log(`Failed to load Environment Details from (${apiUrl}), loading them from (${localUrl}) instead.`);
							return this._httpObj
								.get(localUrl)
								.toPromise();
						});
				}
			})
			.then((data: any) => {
				this._setEnvironmentDetails(data);
				return this._environmentDetails;
			})
			.catch((err: any) => {
				console.error(`Failed to load Environment Details from (${apiUrl}) and from (${localUrl}), contact support.`);
				return Promise.reject(err);
			});
		return this._loadingProm;
	}
	whenLoaded(): Promise<UamEnvironmentDetails> {
		if(this._loadingProm){
			return this._loadingProm;
		}
		else{
			return this.load();
		}
	}
	_setEnvironmentDetails(envDeets: UamEnvironmentDetails): void {
		this._environmentDetails = <UamEnvironmentDetails> envDeets;
		//cache the details
		let cache = JSON.stringify(_.merge({},this._environmentDetails,{cachedAt: Date.now()}));
		window.sessionStorage.setItem(CACHE_KEY,cache);
	}
	get cachedAt(){
		return this._environmentDetails.cachedAt || null;
	}
	get environmentDetails(): UamEnvironmentDetails {
		return this._environmentDetails;
	}
	get baseUrl(): string {
		const baseUrl = location.protocol + '//' + location.host + '/';
		return baseUrl;
	}
	get apiUrl(): string {
		return _.get(this._environmentDetails,'uam.apiUrl');
	}
	get clientId(): string {
		return _.get(this._environmentDetails,'uam.clientId');		
	}
}
