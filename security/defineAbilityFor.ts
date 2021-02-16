import { AbilityBuilder, Ability, InferSubjects, AbilityClass } from '@casl/ability'
import permissions from '../const/permissions';
import { Application, Channel, Dashboard, Form, Notification, Page, Permission, Record, Resource, Role, Step, User, Version, Workflow } from '../models';
import checkPermission from '../utils/checkPermission';
import mongoose from 'mongoose';

/*  Define types for casl usage
 */
type Actions = 'create' | 'read' | 'update' | 'delete';
type Models = Application | Channel | 'Channel' | Dashboard | Form | Notification | Page | Permission | Record | Resource | Role | Step | User | Version | Workflow 
type Subjects = InferSubjects<Models>;

export type AppAbility = Ability<[Actions, Subjects]>;
const AppAbility = Ability as AbilityClass<AppAbility>;

/*  Define a const for common filters on permissions
 */
function filters(type: string, user: User) {
  switch (type) {
    case 'canSee': {
      return {'permissions.canSee': { $in: user.roles.map(x => mongoose.Types.ObjectId(x._id))}};
    }
    case 'canCreate': {
      return {'permissions.canCreate': { $in: user.roles.map(x => mongoose.Types.ObjectId(x._id))}};
    }
    case 'canUpdate': {
      return {'permissions.canUpdate': { $in: user.roles.map(x => mongoose.Types.ObjectId(x._id))}};
    }
    case 'canDelete': {
      return {'permissions.canDelete': { $in: user.roles.map(x => mongoose.Types.ObjectId(x._id))}};
    }
  }
}

/*  Store the user and abilities so we don't redo it for each request
 */
let _user: User = null;
let _ability: AppAbility = null;

/*  Define abilities for the given user. Then store them and define them again only on user change.
 *  Define document users can create, read, update and delete.
 */
export default function defineAbilitiesFor(user: User): AppAbility {
  if (JSON.stringify(user) === JSON.stringify(_user)) {
    return _ability;
  } else {
    console.log('🛡️  Define abilities');
    const { can, cannot, rules } = new AbilityBuilder(AppAbility);
  
    // Default abilities
    can(['read', 'create', 'update', 'delete'], 'Record');
  
    // Permissions check abilities
    if (checkPermission(user, permissions.canSeeApplications)) {
      can('read', 'Application');
    } else {
      can('read', 'Application', filters('canSee', user));
    }
  
    if(checkPermission(user, permissions.canManageApplications)) {
      can(['read', 'create', 'update', 'delete'], ['Application', 'Dashboard', 'Page', 'Step', 'Workflow', 'Channel']);
    } else {
      can('read', ['Application', 'Page', 'Step'], filters('canSee', user));
      can('update', ['Application', 'Page', 'Step'], filters('canUpdate', user));
      can('delete', ['Application', 'Page', 'Step'], filters('canDelete', user));
      const ability: AppAbility = new Ability(rules)
      const contentFilters = Page.accessibleBy(ability, 'read');
    }
  
    if (checkPermission(user, permissions.canSeeForms)) {
      can('read', 'Form');
    } else {
      can('read', 'Form', filters('canSee', user));
    }
  
    if (checkPermission(user, permissions.canManageForms)) {
      can(['create', 'update', 'delete'], 'Form');
    } else {
      can('update', 'Form', filters('canUpdate', user));
      can('delete', 'Form', filters('canDelete', user));
    }
  
    if(checkPermission(user, permissions.canSeeResources)) {
      can('read', 'Resource');
    } else {
      can('read', 'Resource', filters('canSee', user));
    }
  
    if (checkPermission(user, permissions.canManageResources)) {
      can(['create', 'update', 'delete'], 'Resource');
    } else {
      can('update', 'Resource', filters('canUpdate', user));
      can('delete', 'Resource', filters('canDelete', user));
    }
  
    if (checkPermission(user, permissions.canSeeRoles)) {
      can(['create', 'read', 'update', 'delete'], 'Role');
    } else {
      let applications = [];
      user.roles.map(role => {
        if (role.application) {
          if (role.permissions.some(perm => perm.type === permissions.canSeeRoles)) {
            applications.push(mongoose.Types.ObjectId(role.application));
          }
        }
      });
      can(['create', 'read', 'update', 'delete'], 'Role', {application: applications});
    }
  
    if (checkPermission(user, permissions.canSeeUsers)) {
      can(['create', 'read', 'update', 'delete'], 'User');
    } else {
      let applications = [];
      user.roles.map(role => {
        if (role.application) {
          if (role.permissions.some(perm => perm.type === permissions.canSeeUsers)) {
            applications.push(mongoose.Types.ObjectId(role.application));
          }
        }
      });
      can(['create', 'read', 'update', 'delete'], 'Role', {application: applications});
    }
  
    _user = user;
    _ability = new Ability(rules);
    return _ability;
  }
};