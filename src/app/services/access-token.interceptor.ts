import { Injectable } from '@angular/core';
import {
	HttpRequest,
	HttpHandler,
	HttpEvent,
	HttpInterceptor
} from '@angular/common/http';
import { UserSessionService } from '../../../projects/auth/src/lib/services/user-session.service';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';


@Injectable()
export class AccessTokenInterceptor implements HttpInterceptor {
	constructor(public _userSession: UserSessionService) { }
	intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
		return from(this._userSession.getSessionDetails())
			.pipe(
				switchMap(sessionDetails => {
					if(sessionDetails){
						let requestClone = request.clone({
							setHeaders: {
								Authorization: `Bearer ${sessionDetails.access_token}`
							}
						});
						return next.handle(requestClone);
					}
					else{
						return next.handle(request);
					}
				})
			);
	}
}