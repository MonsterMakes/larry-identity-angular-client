import { Injectable } from '@angular/core';
import { UamEnvironmentService } from './uam-environment.service';
import { ActivatedRoute, Router } from '@angular/router';
import { UserSessionService } from './user-session.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import * as forge from "node-forge";

@Injectable()
export class AuthService {
	constructor( 
		private _uamEnvironmentService: UamEnvironmentService,
		private _httpObj: HttpClient,
		private _currentRoute: ActivatedRoute,
		private _router: Router,
		private _userSession: UserSessionService
	) { }
	/**
	 * Takes a base64 encoded string and returns a url encoded string
	 * by replacing the characters + and / with -, _ respectively,
	 * and removing the = (fill) character.
	 */
	static base64UrlEncode(str): string {
		let b64d = window.btoa(str);
		let urlEncoded = b64d.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
		return urlEncoded;
	}

	/**
	 * Returns a PKCE code verifier
	 * See https://www.oauth.com/oauth2-servers/pkce/ for more info.
	 */
	static createCodeVerifier(): string{		
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
	static createCodeChallenge(codeVerifier): string{
		let asciiCodeVerifier = forge.util.encodeUtf8(codeVerifier);
		let codeVerifierSha = forge.md.sha256.create();
		codeVerifierSha.update(asciiCodeVerifier);
		let codeVerifierShaDigest = codeVerifierSha.digest();
		let codeChallenge = AuthService.base64UrlEncode(codeVerifierShaDigest.data);
		return codeChallenge;
	}

	/**
	 * Starts the authorization code grant with PKCE flow.
	 * This will cause the browser to be redirected, therefore the promise will NOT return.
	 */
	async login(redirectUri: string, state: string): Promise<any>{
		// when we have the uam environment details
		await this._uamEnvironmentService.whenLoaded();
				
		console.debug('Verifying session...',{
			uamEnvironmentService: this._uamEnvironmentService,
			routeInfo: this._currentRoute
		});

		const sessionDetails = this._userSession.getSessionDetails();
		if(sessionDetails){
			console.info(`Session already active for domain (${this._uamEnvironmentService.apiUrl})...`);
			this._sessionVerified(sessionDetails);
		}
		// No active session so we need to start the login process
		else{
			let code_verifier = AuthService.createCodeVerifier();
			//Shove this in localStorage its required when exchanging the code for the token
			window.sessionStorage.setItem(`${this._uamEnvironmentService.apiUrl}code_verifier`,code_verifier);
			let code_challenge = AuthService.createCodeChallenge(code_verifier);
				
			// Session is currently not authenticated
			let loginUrl = new URL(`${this._uamEnvironmentService.apiUrl}login`);
			// here we encode the authorization request
			let params = {
				redirect_uri: redirectUri,
				client_id: this._uamEnvironmentService.clientId,
				code_challenge: code_challenge,
				state: state
			};
			let loginParams = new URLSearchParams(<any> params);

			loginUrl.search = loginParams.toString();
			console.debug('Session is currently not authenticated starting the Authorizatiion Code Grant flow...',{
				authorizationUrl: loginUrl.toString(),
				code_verifier,
				code_challenge
			});
			window.location.assign(loginUrl.toString());
		}
	}

	_sessionVerified(sessionDetails){
		let landingPage = '/landing';
		//TODO look for custom route somewhere???
		this._router.navigate([landingPage, { sessionDetails }]);
		//TODO Verify that the silent authentication is working and set the correct timer
		//console.log('TODO on boot make sure we start the silent authentication.');
	}

	/**
	 * Exchange the authorization code for the Token.
	 * This completes the authorization code grant flow.
	 */
	async exchangeCodeForToken(authorizationCode: string): Promise<any>{
		// when we have the uam environment details
		await this._uamEnvironmentService.whenLoaded();

		let codeVerifier = window.sessionStorage.getItem(`${this._uamEnvironmentService.apiUrl}code_verifier`);

		let redirect_uri = `${window.location.origin}/code-callback`;//this must match the one provided in the login request
		let tokenUrl = `${this._uamEnvironmentService.apiUrl}token`;
		let tokenRequestPayload = {
			grant_type: 'authorization_code',
			client_id: this._uamEnvironmentService.clientId,
			code: authorizationCode,
			code_verifier: codeVerifier,
			redirect_uri: `${window.location.origin}/code-callback`
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
				return this._userSession.setSessionDetails(data);
			})
			.then(() => {
				return this._sessionVerified(this._userSession.getSessionDetails());
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
}