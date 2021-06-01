import { GraphQLError, GraphQLInt, GraphQLList } from "graphql";
import { ApplicationType } from "../types";
import { Application } from "../../models";
import errors from "../../const/errors";
import { AppAbility } from "../../security/defineAbilityFor";
import GraphQLJSON from "graphql-type-json";

export default {
    /*  List all applications available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(ApplicationType),
    args: {
        first: {type: GraphQLInt},
        offset: {type: GraphQLInt},
        filters: {type: GraphQLJSON},
        sort: {type: GraphQLJSON}
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }
        const ability: AppAbility = context.user.ability;

        const filters = buildFilters(args.filters);

        if (args.offset === 0 || args.offset) {
            if (!args.first) {
                throw new GraphQLError(errors.invalidPaginationArguments);
            }
            return Application.find(filters).accessibleBy(ability).skip(args.first * args.offset).limit(args.first).sort(args.sort);
        } else {
            return Application.find(filters).accessibleBy(ability).sort(args.sort);
        }
    }
}

const buildFilters = (filters: any) => {
    if (filters) {
        const conditions = [];

        if (filters.name && filters.name.trim().length > 0) {
            conditions.push({name: {$regex: new RegExp(filters.name, 'i')}});
        }
        if (filters.dateRange.start.trim().length > 0 && filters.dateRange.end.trim().length > 0) {
            conditions.push({
                createdAt: {
                    $gte: new Date(filters.dateRange.start),
                    $lte: new Date(filters.dateRange.end)
                }
            })
        }

        if (filters.status && filters.status.trim().length > 0) {
            conditions.push({status: {$regex: filters.status}});
        }

        if (conditions.length > 0) {
            return {
                $and: conditions
            };
        }
    }
    return {};
}

