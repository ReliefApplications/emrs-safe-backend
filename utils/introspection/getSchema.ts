import { extendSchema, GraphQLBoolean, GraphQLID, GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLSchema, GraphQLString, parse } from "graphql";
import { pluralize, camelize } from 'inflection';
import getFilterTypes from "./getFilterTypes";
import getMetaTypes from "./getMetaTypes";
import { getRelatedType, getRelatedTypeName } from "./getTypeFromKey";
import getTypes from "./getTypes";
import { isRelationshipField } from "./isRelationshipField";

export default (data, typesById) => {

    const types = getTypes(data);

    const typesByName = types.reduce((types, type) => {
        types[type.name] = type;
        return types;
    }, {});

    const filterTypesByName = getFilterTypes(data);
    
    const metaTypesByName = getMetaTypes(data);

    const queryType = new GraphQLObjectType({
        name: 'Query',
        fields: types.reduce((fields, type) => {
            fields[type.name] = {
                type: typesByName[type.name],
                args: {
                    id: { type: new GraphQLNonNull(GraphQLID) },
                },
            };
            fields[`all${camelize(pluralize(type.name))}`] = {
                type: new GraphQLList(typesByName[type.name]),
                args: {
                    page: { type: GraphQLInt },
                    perPage: { type: GraphQLInt },
                    sortField: { type: GraphQLString },
                    sortOrder: { type: GraphQLString },
                    filter: { type: filterTypesByName[type.name] },
                },
            };
            // fields[`_all${camelize(pluralize(type.name))}Meta`] = {
            //     type: metaTypesByName[type.name],
            //     args: {
            //         page: { type: GraphQLInt },
            //         perPage: { type: GraphQLInt },
            //         filter: { type: filterTypesByName[type.name] },
            //     },
            // };
            return fields;
        }, {}),
    });

    // TODO: check if we can redo that
    const mutationType = new GraphQLObjectType({
        name: 'Mutation',
        fields: types.reduce((fields, type) => {
            const typeFields = typesByName[type.name].getFields();
            const nullableTypeFields = Object.keys(typeFields).reduce(
                (f, fieldName) => {
                    f[fieldName] = Object.assign({}, typeFields[fieldName], {
                        type:
                            fieldName !== 'id' &&
                                typeFields[fieldName].type instanceof GraphQLNonNull
                                ? typeFields[fieldName].type.ofType
                                : typeFields[fieldName].type,
                    });
                    return f;
                },
                {}
            );
            fields[`create${type.name}`] = {
                type: typesByName[type.name],
                args: typeFields,
            };
            fields[`update${type.name}`] = {
                type: typesByName[type.name],
                args: nullableTypeFields,
            };
            fields[`remove${type.name}`] = {
                type: GraphQLBoolean,
                args: {
                    id: { type: new GraphQLNonNull(GraphQLID) },
                },
            };
            return fields;
        }, {}),
    });

    const schema = new GraphQLSchema({
        query: queryType,
        mutation: mutationType,
    });

    const schemaExtension: any = Object.values(typesByName).reduce((ext, type: any) => {
        Object.keys(type.getFields())
            .filter(isRelationshipField)
            .map((fieldName) => {
                const relType = getRelatedType(fieldName, data[type.toString()], typesById);
                const rel = pluralize(type.toString());
                ext += `
    extend type ${type} { ${getRelatedTypeName(fieldName)}: ${relType} }
    extend type ${relType} { ${rel}(filter: ${filterTypesByName[type.name]}): [${type}] }`;
            });
        return ext;
    }, '');

    return schemaExtension
        ? extendSchema(schema, parse(schemaExtension))
        : schema;
}