import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
   {
    path: 'login',
    loadChildren: () => import('./components/public/public-module').then((module)=> module.PublicModule),     
  },
  {
    path: 'private',
    loadChildren: () => import('./components/private/private-module').then((module)=> module.PrivateModule),     
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
