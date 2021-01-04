import { GraphQLNonNull, GraphQLString, GraphQLList, GraphQLError } from "graphql";
import GraphQLJSON from "graphql-type-json";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import { Resource } from "../../models";
import checkPermission from "../../utils/checkPermission";
import { ResourceType } from "../types";
import pubsub from "../../server/pubsub";
import notifications from "../../const/notifications";

export default {
    /*  Creates a new resource.
        Throws GraphQL error if not logged or authorized.
    */
    type: ResourceType,
    args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        fields: { type: new GraphQLNonNull(new GraphQLList(GraphQLJSON)) },
    },
    async resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canManageResources)) {
            const resource = new Resource({
                name: args.name,
                createdAt: new Date(),
                fields: args.fields,
                permissions: {
                    canSee: [],
                    canCreate: [],
                    canUpdate: [],
                    canDelete: []
                }
            });
            const publisher = await pubsub();
            publisher.publish('notification', {
                notification: {
                    action: 'Resource created',
                    content: resource,
                    createdAt: new Date(),
                    type: notifications.resources
                }
            });
            return resource.save();
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    },
}