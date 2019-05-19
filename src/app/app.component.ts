import { Component, OnInit, OnDestroy, enableProdMode } from '@angular/core';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
	title = 'manual-test';
	constructor() {
	}
	ngOnInit() {
	}
	ngOnDestroy() {
	}
}
