import { BrowserModule } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { HttpClientModule } from '@angular/common/http';

import { EnvironmentService } from './services/environment.service';
import { LandingComponent } from './components/landing/landing.component';

@NgModule({
	declarations: [
		AppComponent,
		LandingComponent
	],
	imports: [
		BrowserModule,
		AppRoutingModule,
		HttpClientModule
	],
	providers: [
		EnvironmentService,
		{
			// Provider for APP_INITIALIZER
			provide: APP_INITIALIZER,
			useFactory: (environmentService: EnvironmentService) => {
				return () => environmentService.load();
			},
			deps: [EnvironmentService],
			multi: true
		}
	],
	bootstrap: [AppComponent]
})
export class AppModule { }
