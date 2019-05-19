import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';

const routes: Routes = [
	{ path: '', redirectTo: 'auth/login', pathMatch: "full" },
	{ path: 'login', redirectTo: 'auth/login' },
	{ path: 'code-callback', redirectTo: 'auth/code-callback' },
	{ path: 'auth', loadChildren: './lazy-modules/auth-lib-wrapper.module#AuthLibWrapperModule' },
	{ path: 'landing', component: LandingComponent}
];

@NgModule({
	imports: [RouterModule.forRoot(routes)],
	exports: [RouterModule]
})
export class AppRoutingModule { }
