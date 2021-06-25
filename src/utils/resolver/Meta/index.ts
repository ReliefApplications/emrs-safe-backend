import { defaultMetaFieldsFlat, UserMetaType } from '../../../const/defaultRecordFields';
import { getMetaFields } from '../../introspection/getFields';
import getReversedFields from '../../introspection/getReversedFields';
import { getRelatedTypeName, getRelationshipFromKey } from '../../introspection/getTypeFromKey';
import { isRelationshipField } from '../../introspection/isRelationshipField';
import meta from '../Query/meta';
import checkboxMeta from './checkbox.resolver';
import dropdownMeta from './dropdown.resolver';
import radiogroupMeta from './radiogroup.resolver';
import tagboxMeta from './tagbox.resolver';

function Meta(entityName, data, id, ids) {

    const entityFields = Object.keys(getMetaFields(data[entityName]));

    const manyToOneResolvers = entityFields.filter(isRelationshipField).reduce(
        (resolvers, fieldName) => {
            return Object.assign({}, resolvers, {
                [getRelatedTypeName(fieldName)]: meta(ids[getRelatedTypeName(fieldName)])
            })
        },
        {}
    );

    const defaultResolvers = defaultMetaFieldsFlat.reduce(
        (resolvers, fieldName) =>
            Object.assign({}, resolvers, {
                [fieldName]: () => {
                    return fieldName === '_source' ? id : {
                        name: fieldName
                    }
                }
            }),
        {}
    );

    const classicResolvers = entityFields.filter(x => !defaultMetaFieldsFlat.includes(x)).reduce(
        (resolvers, fieldName) =>
            Object.assign({}, resolvers, {
                [fieldName]: (entity) => {
                    const field = isRelationshipField(fieldName) ?
                        entity[fieldName.substr(0, fieldName.length - (fieldName.endsWith('_id') ? 3 : 4))] :
                        entity[fieldName];
                    switch (field.type) {
                        case 'dropdown': {
                            return dropdownMeta(field);
                        }
                        case 'radiogroup': {
                            return radiogroupMeta(field);
                        }
                        case 'checkbox': {
                            return checkboxMeta(field);
                        }
                        case 'tagbox': {
                            return tagboxMeta(field);
                        }
                        default: {
                            return field;
                        }
                    }
                }
            }),
        {}
    );

    const usersResolver = {
        createdBy: {
            type: UserMetaType,
            resolve(entity) {
                return entity ? true : false;
            }
        },
        lastUpdatedBy: {
            type: UserMetaType,
            resolve(entity) {
                return entity ? true : false;
            }
        }
    }

    const entities = Object.keys(data);
    const oneToManyResolvers = entities.reduce(
        // tslint:disable-next-line: no-shadowed-variable
        (resolvers, entityName) =>
            Object.assign({}, resolvers, Object.fromEntries(
                getReversedFields(data[entityName], id).map(() => {
                    return [getRelationshipFromKey(entityName), meta(ids[entityName])];
                })
            )
            )
        ,{}
    );

    return Object.assign({}, defaultResolvers, classicResolvers, manyToOneResolvers, oneToManyResolvers, usersResolver);
}

export default Meta;
