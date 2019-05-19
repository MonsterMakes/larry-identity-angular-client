import { NgModule, APP_INITIALIZER } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthRoutingModule } from './auth-routing.module';
import { UamEnvironmentService } from './services/uam-environment.service';

import { LoginComponent } from './components/login/login.component';
import { CodeCallbackComponent } from './components/code-callback/code-callback.component';
import { UserSessionService } from './services/user-session.service';
import { AuthService } from './services/auth.service';

@NgModule({
  declarations: [
	  LoginComponent, 
	  CodeCallbackComponent
  ],
  imports: [
	AuthRoutingModule,
	CommonModule
  ],
  exports: [
	  LoginComponent,
	  CodeCallbackComponent
  ],
  providers: [
	UamEnvironmentService,
	UserSessionService,
	AuthService
  ]
})
export class AuthModule {
	constructor() {} 
}
