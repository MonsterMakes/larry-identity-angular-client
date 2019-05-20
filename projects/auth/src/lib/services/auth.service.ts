import { Injectable } from '@angular/core';
import { UamEnvironmentService } from './uam-environment.service';
import { ActivatedRoute, Router } from '@angular/router';
import { UserSessionService, SessionDetails } from './user-session.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import * as _ from 'lodash';
import * as forge from 'node-forge';
import { ErrorDetails } from '../interfaces/error-details.interface';

const SILENT_AUTHENTICATION_POLLING_INTERVAL = 30000;
const SILENT_AUTHENTICATION_TIMEOUT = 10000;
@Injectable({
	providedIn: 'root'
})
export class AuthService {
	private _silentLoginWindowElem: HTMLIFrameElement;
	private _silentAuthenticationTimeoutTimerId: number;
	private _silentAuthenticationPollingTimerId: number;
	
	constructor( 
		private _uamEnvironmentService: UamEnvironmentService,
		private _httpObj: HttpClient,
		private _currentRoute: ActivatedRoute,
		private _router: Router,
		private _userSession: UserSessionService
	) {}

	/*********************************************************************************/
	/*********************************************************************************/
	/* START PUBLIC AUTH METHODS */
	/*********************************************************************************/
	/*********************************************************************************/

	/**
	 * Starts the authorization code grant with PKCE flow.
	 * NOTE: This will cause the browser to be redirected, therefore the promise will NOT return.
	 */
	async login(state: string){
		// when we have the uam environment details
		await this._uamEnvironmentService.whenLoaded();
				
		console.debug('Verifying session...',{
			uamEnvironmentService: this._uamEnvironmentService,
			routeInfo: this._currentRoute
		});

		const sessionIsActive = await this._userSession.isSessionActive();
		if(sessionIsActive){
			console.info(`Session already active for domain (${this._uamEnvironmentService.apiUrl})...`);
			this._sessionVerifiedHandler();
		}
		// No active session so we need to start the login process
		else{
			//generate the pkce deets
			let pkceDetails = AuthService.createCodeVerfierAndChallenge();
			//store the code_verifier in session storage
			window.sessionStorage.setItem(`${this._uamEnvironmentService.apiUrl}code_verifier`,pkceDetails.code_verifier);
			// produce the login url
			let loginUrl = this._buildLoginUrl(`${window.location.origin}/auth/code-callback`, state, pkceDetails.code_challenge)
			console.debug('Session is currently not authenticated starting the Authorizatiion Code Grant flow...',{
				authorizationUrl: loginUrl.toString()
			});
			// navigate to the login
			window.location.assign(loginUrl);
		}
	}

	/**
	 * Exchange the authorization code for the Token.
	 * This completes the authorization code grant flow.
	 */
	async exchangeCodeForToken(authorizationCode: string, dontRedirect?: boolean): Promise<any>{
		// when we have the uam environment details
		await this._uamEnvironmentService.whenLoaded();

		let codeVerifier = window.sessionStorage.getItem(`${this._uamEnvironmentService.apiUrl}code_verifier`);

		let redirect_uri = `${window.location.origin}/auth/code-callback`;//this must match the one provided in the login request
		let tokenUrl = `${this._uamEnvironmentService.apiUrl}token`;
		let tokenRequestPayload = {
			grant_type: 'authorization_code',
			client_id: this._uamEnvironmentService.clientId,
			code: authorizationCode,
			code_verifier: codeVerifier,
			redirect_uri: redirect_uri
		};
		// make the Token request
		return await this._httpObj
			.post(
				tokenUrl,
				tokenRequestPayload,
				{ headers: new HttpHeaders({ 'Content-Type': 'application/json' }) }
			)
			.toPromise()
			.then((data: any) => {
				console.debug(`Successfully exchanged code for tokens...`, {
					tokenUrl,
					tokenRequestPayload,
					authorizationCode,
					data: data
				});
				// Store response in sessionStorage
				return this._userSession.__setSessionDetails(data);
			})
			.then(async () => {
				return this._sessionVerifiedHandler(dontRedirect);
			})
			.catch((err: any) => {
				console.error(`Failed to exchange code for token (${tokenUrl}), contact support.`, {
					tokenUrl,
					tokenRequestPayload,
					authorizationCode,
					error: err
				});
				return Promise.reject(err);
			});
	}

	/**
	 * Logs the user out of the application.
	 * NOTE: This will cause the browser to be redirected, therefore the promise will NOT return.
	 */
	async logout(cause: ErrorDetails) {
		await this._uamEnvironmentService.whenLoaded();
		await this._userSession.__clearSession();
		this._shutdownSilentLogin();
		// logout the user and redirect them to /auth/logged-out
		window.location.assign(this._buildLogoutUrl(cause));
	}

	//--- START PUBLIC AUTH HANDLER METHODS ---//
	/**
	 * Called when the user session has been verified and the user is logged in
	 */
	_sessionVerifiedHandler(dontRedirect?: boolean): void{
		if(!dontRedirect){
			let landingPage = '/landing';
			//Verify that the silent authentication is working and set the correct timer
			this._initializeSilentLogin();
			//TODO should we look for custom route somewhere???
			this._router.navigate([landingPage]);
		}
	}
	//--- END PUBLIC AUTH HANDLER METHODS ---//

	/*********************************************************************************/
	/*********************************************************************************/
	/* END PUBLIC AUTH METHODS */
	/* START SILENT AUTHENTICATION METHODS */
	/*********************************************************************************/
	/*********************************************************************************/	

	/**
	 * Places an iframe on the page and starts a polling timer to periodically verifies the user's session in the Authorization Server.
	 * If the user's tokens are about to expire they will be re-issued
	 * If the user has been logged out of the session in the Authorization Server the user will be logged out of the clientside application and the tokens will be destroyed.
	 * 
	 * Promise is returned when the silent login as been initialized.
	 */
	async _initializeSilentLogin(): Promise<undefined>{
		if(!this._silentLoginWindowElem){
			// when we have the uam environment details
			await this._uamEnvironmentService.whenLoaded();
			let foundElem = document.querySelector('#silent-auth');
			if(!foundElem){
				let redirect_uri = `${window.location.origin}/auth/silent-code-callback`;
				let state = '{}';
				this._silentLoginWindowElem = window.document.createElement('iframe');
				this._silentLoginWindowElem.id = 'silent-auth';
				this._silentLoginWindowElem.style.display = 'none';
				window.addEventListener('message', this._silentLoginEventHandler = this._silentLoginEventHandler.bind(this), false);
				window.document.body.appendChild(this._silentLoginWindowElem);
				// If polling timer is not  already created (making sure multiple timers cannot be started)
				if(!this._silentAuthenticationPollingTimerId){
					this._silentAuthenticationPollingTimerId = window.setInterval(()=>{
						// If previous silent authentication request is NOT in progress
						if(!this._silentAuthenticationTimeoutTimerId){
							//TODO can we tell if the previouse one has complete? Does it matter?
							//generate the pkce deets
							let pkceDetails = AuthService.createCodeVerfierAndChallenge();
							//store the code_verifier in the iframe session storage
							this._silentLoginWindowElem.contentWindow.sessionStorage.setItem(`${this._uamEnvironmentService.apiUrl}code_verifier`,pkceDetails.code_verifier);
							// produce the login url
							let loginUrl = this._buildLoginUrl(redirect_uri, state, pkceDetails.code_challenge, 'none')
							console.debug('Initiating silent login request using Authorizatiion Code Grant flow...',{
								authorizationUrl: loginUrl.toString()
							});
							// navigate to the login
							this._silentLoginWindowElem.contentWindow.location.assign(loginUrl);
							
							// setup a timeout for edge caces
							this._silentAuthenticationTimeoutTimerId = window.setTimeout(()=>{			
								this._silentLoginFailed({
									error: "Timed Out",
									error_description: 'Silent Authentication Failed, due to timeout. Take a look at the developer tools network tab or the #silent-auth iframe for more details.',
									additional_details: {loginRequestUrl: loginUrl}
								});
							},SILENT_AUTHENTICATION_TIMEOUT);
						}
						//a previous silentAuthentication request is still in progress lets skip this one
						else{
							console.debug('Silent authentication request being skipped due to current request still in progress...');
						}
					},SILENT_AUTHENTICATION_POLLING_INTERVAL);
				}
			}
		}
		return;
	}

	/**
	 * If a silent login has been initialized this will tear it down.
	 */
	_shutdownSilentLogin(): void{
		if(this._silentLoginWindowElem){
			this._clearSilentAuthenticationTimeoutTimer();
			this._clearSilentAuthenticationPollingTimer();
			window.removeEventListener('message', this._silentLoginEventHandler, false);
			window.document.body.removeChild(this._silentLoginWindowElem);
			this._silentLoginWindowElem = null;
		}
	}

	_clearSilentAuthenticationPollingTimer(): void{
		if(this._silentAuthenticationPollingTimerId){
			window.clearTimeout(this._silentAuthenticationPollingTimerId);
			this._silentAuthenticationPollingTimerId = null;
		}
	}

	_clearSilentAuthenticationTimeoutTimer(): void{
		if(this._silentAuthenticationTimeoutTimerId){
			window.clearTimeout(this._silentAuthenticationTimeoutTimerId);
			this._silentAuthenticationTimeoutTimerId = null;
		}
	}

	_silentLoginFailed(errorDetails: ErrorDetails): void{
		if(errorDetails.error === 'login_required'){
			console.warn('User logged out of the Authorization Server\'s session. Logging user out of application session.',{errorDetails});
			this.logout(errorDetails);
		}
		else{
			let error = _.get(errorDetails,'error','Unkown Error');
			let errorMsg = _.get(errorDetails,'error_description','Unkown Error was encountered, take a look at the developer tools network tab or the #silent-auth iframe for more details.');
			let errorAdditionalDetails = _.get(errorDetails,'additional_details');
			console.error(`${error}, ${errorMsg}`,errorAdditionalDetails);
			//We are doing nothing but logging here because this is an unknown error, we do not know if the user's session has ended, subsequent requests should hopefully fix the issue.
		}
	}
	
	//--- START SILENT AUTHENTICATION HANDLER METHODS ---//
	/**
	 * Called when the silent login iframe has recieved authorization code callback
	 * 
	 * NOTE: This method returns a promise but its called by the browser's postMessage Event Handling mechanism and therefore is ignored.
	 */
	async _silentLoginEventHandler(event: MessageEvent) {
		//if we get a postMessage from our iframe
		if(event.source === this._silentLoginWindowElem.contentWindow){
			this._clearSilentAuthenticationTimeoutTimer();
			if(event.data){
				console.debug('Received silent login code callback post message event...',{
					eventData: event.data,
					currentUrl: this._silentLoginWindowElem.contentWindow.location.href
				});
				// code retriival failed
				if(event.data.error){
					this._silentLoginFailed(event.data);
				}
				else{
					//check if exp is close if so exchange code for tokens
					let sessionExpiresDate = await this._userSession.whenWillSessionExpire();
					let sessionExpiresDateEpoch = Date.now();

					// if there is an active session set the expiration time
					if(sessionExpiresDate){
						sessionExpiresDateEpoch = sessionExpiresDate.getTime();
					}
					
					let nextSilentAuthenticationPollEpoch = Date.now() + (2 * SILENT_AUTHENTICATION_POLLING_INTERVAL);	
					// if the session will expire before the next refresh
					if(sessionExpiresDateEpoch <= nextSilentAuthenticationPollEpoch){
						await this.exchangeCodeForToken(event.data.code);
					}
				}
			}
		}
	}
	//--- END SILENT AUTHENTICATION HANDLER METHODS ---//

	/*********************************************************************************/
	/*********************************************************************************/
	/* END SILENT AUTHENTICATION METHODS */
	/* START STATIC HELPER METHODS */
	/*********************************************************************************/
	/*********************************************************************************/	

	/**
	 * Takes a string base64 encodes it and url encodes it
	 * by replacing the characters + and / with -, _ respectively,
	 * and removing the = (fill) character.
	 */
	static base64UrlEncode(str: string): string {
		let b64d = window.btoa(str);
		let urlEncoded = b64d.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
		return urlEncoded;
	}

	/**
	 * Takes a base64 encoded string and returns a url encoded string
	 * by replacing the characters + and / with -, _ respectively,
	 * and removing the = (fill) character.
	 */
	static base64UrlDecode(urlSafeStr: string): string {
		let b64d = urlSafeStr.replace(/_/g, '/').replace(/-/g, '+');
		let str = window.atob(b64d)
		
		return str;
	}

	/**
	 * Returns a PKCE code verifier
	 * See https://www.oauth.com/oauth2-servers/pkce/ for more info.
	 */
	static createCodeVerifier(): string {		
		let codeVerifier = '';
		let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
		let charactersLength = characters.length;
		//code_verifier must be between 43 and 128 (https://tools.ietf.org/html/rfc7636#section-4.1)
		for ( var i = 0; i < 75; i++ ) {
		  codeVerifier += characters.charAt(Math.floor(Math.random() * charactersLength));
		}
		return codeVerifier;
	}

	/**
	 * Creates and returns a Code Challenge based on the provided codeverifier
	 * See https://www.oauth.com/oauth2-servers/pkce/ for more info.
	 */
	static createCodeChallenge(codeVerifier): string {
		let asciiCodeVerifier = forge.util.encodeUtf8(codeVerifier);
		let codeVerifierSha = forge.md.sha256.create();
		codeVerifierSha.update(asciiCodeVerifier);
		let codeVerifierShaDigest = codeVerifierSha.digest();
		let codeChallenge = AuthService.base64UrlEncode(codeVerifierShaDigest.data);
		return codeChallenge;
	}

	static createCodeVerfierAndChallenge(): {code_verifier: string, code_challenge: string} {
		let code_verifier = AuthService.createCodeVerifier();
		let code_challenge = AuthService.createCodeChallenge(code_verifier);
		return {code_verifier,code_challenge};
	}

	/*********************************************************************************/
	/*********************************************************************************/
	/* END STATIC HELPER METHODS */
	/* START PRIVATE AUTH METHODS */
	/*********************************************************************************/
	/*********************************************************************************/	

	_buildLoggedOutUrl(cause): string {
		let logoutUrl = new URL(`${window.location.origin}/auth/logged-out`);
		let params = {
			cause: AuthService.base64UrlEncode(JSON.stringify(cause))
		};
		let queryParams = new URLSearchParams(<any> params);

		logoutUrl.search = queryParams.toString();
		return logoutUrl.toString();
	}

	_buildLogoutUrl(cause): string {
		let logoutUrl = new URL(`${this._uamEnvironmentService.apiUrl}logout`);
		let params = {
			client_id: this._uamEnvironmentService.clientId,
			returnTo: this._buildLoggedOutUrl(cause)
		};
		let queryParams = new URLSearchParams(<any> params);

		logoutUrl.search = queryParams.toString();
		return logoutUrl.toString();
	}

	_buildLoginUrl(redirectUri: string, state: string, code_challenge: string, prompt?: string): string {
		let loginUrl = new URL(`${this._uamEnvironmentService.apiUrl}login`);
		// here we encode the authorization request
		let params = {
			redirect_uri: redirectUri,
			client_id: this._uamEnvironmentService.clientId,
			code_challenge: code_challenge,
			state: state,
			prompt: prompt
		};
		let loginParams = new URLSearchParams(<any> params);

		loginUrl.search = loginParams.toString();
		return loginUrl.toString();
	}

	/*********************************************************************************/
	/*********************************************************************************/
	/* END PRIVATE AUTH METHODS */
	/*********************************************************************************/
	/*********************************************************************************/	
}