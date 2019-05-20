import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';

const routes: Routes = [
	// Required by AUTH Module
	{ path: 'auth', loadChildren: './lazy-modules/auth-lib-wrapper.module#AuthLibWrapperModule' },
	{ path: 'landing', component: LandingComponent}, // This is the route executed once the user is successfully logged in

	// Optional Auth Routes
	{ path: '', redirectTo: 'auth/login', pathMatch: "full" }
];

@NgModule({
	imports: [RouterModule.forRoot(routes)],
	exports: [RouterModule]
})
export class AppRoutingModule { }
