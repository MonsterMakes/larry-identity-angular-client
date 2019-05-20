import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
	selector: 'lry-logged-out',
	templateUrl: './logged-out.component.html',
	styleUrls: ['./logged-out.component.scss']
})
export class LoggedOutComponent implements OnInit {
	__cause: any;

	constructor(private _currentRoute: ActivatedRoute) { }

	ngOnInit() {
		let causeParam = AuthService.base64UrlDecode(this._currentRoute.snapshot.queryParams.cause);
		if(causeParam){
			try{
				this.__cause = JSON.parse(causeParam);
			}
			catch(e){
				console.error('Logged out cause was supplied but invalid JSON...', { causeParam: causeParam });
			}
		}
		
		console.info('User was logged out programatically...', { cause: this.__cause, causeParam: causeParam })
		// let error = _.get(errorDetails,'error','Unkown Error');
		// let errorMsg = _.get(errorDetails,'error_description','Unkown Error was encountered, take a look at the developer tools network tab or the #silent-auth iframe for more details.');
		// let errorAdditionalDetails = _.get(errorDetails,'additional_details');
	}

}
