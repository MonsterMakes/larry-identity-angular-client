import * as forge from "node-forge";

export class AuthUtils{
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
		let codeChallenge = AuthUtils.base64UrlEncode(codeVerifierShaDigest.data);
		return codeChallenge;
	}
}
  