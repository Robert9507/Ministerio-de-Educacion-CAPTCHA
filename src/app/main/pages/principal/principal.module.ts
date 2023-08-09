import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AuthGuard } from 'app/auth/helpers';
import { CoreCommonModule } from '@core/common.module';
import { ContentHeaderModule } from 'app/layout/components/content-header/content-header.module';


import { PrincipalComponent } from 'app/main/pages/principal/principal.component';

const routes: Routes = [
  {
    path: 'inicio',
    component: PrincipalComponent,
    canActivate: [AuthGuard],
    
  }
];

@NgModule({
  declarations: [PrincipalComponent],
  imports: [CommonModule, RouterModule.forChild(routes), NgbModule, CoreCommonModule, ContentHeaderModule],

})
export class PrincipalModule {}
