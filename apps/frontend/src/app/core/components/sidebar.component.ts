/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthRoles } from '@ap2/api-interfaces';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTreeModule } from '@angular/material/tree';
import { RouterModule } from '@angular/router';
import { RolePipe } from '../../shared/utils/role.pipe';
import { AuthenticationService } from '../services/authentication/authentication.service';
import { TreeNode } from './tree-node.interface';

@Component({
  selector: 'app-sidebar',
  imports: [
    RouterModule,
    MatButtonModule,
    MatMenuModule,
    RolePipe,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatTreeModule,
  ],
  providers: [AuthenticationService],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent implements OnInit {
  firstName?: string;
  lastName?: string;
  role?: string;
  AuthRoles = AuthRoles;

  dataSource: TreeNode[] = [
    {
      name: 'Dashboard',
      roles: [AuthRoles.SUSTAINABILITY_MANAGER, AuthRoles.BUYER],
      icon: 'dashboard',
      routerLink: '/',
    },
    {
      name: 'Produkte',
      roles: [AuthRoles.SUSTAINABILITY_MANAGER, AuthRoles.BUYER],
      icon: 'inventory',
      routerLink: '/products',
    },
    {
      name: 'Warengruppen',
      roles: [AuthRoles.SUSTAINABILITY_MANAGER, AuthRoles.BUYER],
      icon: 'summarize',
      routerLink: '/product-groups',
    },
    {
      name: 'Lieferanten',
      roles: [AuthRoles.SUSTAINABILITY_MANAGER, AuthRoles.BUYER],
      icon: 'local_shipping',
      routerLink: '/companies',
    },
    {
      name: 'Verpackung',
      roles: [AuthRoles.SUSTAINABILITY_MANAGER, AuthRoles.BUYER],
      icon: 'package_2',
      routerLink: '/packaging',
    },
    {
      name: 'Berichte',
      roles: [AuthRoles.SUSTAINABILITY_MANAGER],
      icon: 'description',
      routerLink: '/reports',
    },
  ];

  childrenAccessor = (node: TreeNode) => node.children ?? [];

  hasChild = (_: number, node: TreeNode) =>
    !!node.children && node.children.length > 0;

  constructor(private readonly authService: AuthenticationService) {}

  async ngOnInit() {
    const { firstName, lastName } = await this.authService.getCurrentUserName();
    this.firstName = firstName;
    this.lastName = lastName;
    this.role = this.authService.getCurrentUserRole();
  }

  logout() {
    this.authService.logout();
  }
}
