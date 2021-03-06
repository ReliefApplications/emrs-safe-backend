import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import errors from '../../const/errors';
import deleteContent from '../../services/deleteContent';
import { WorkflowType } from '../types';
import { Workflow, Page, Step } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';

export default {
    /*  Delete a workflow from its id and recursively delete steps
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: WorkflowType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        let workflow = null;
        if (ability.can('delete', 'Workflow')) {
            workflow = await Workflow.findByIdAndDelete(args.id);
        } else {
            const page = await Page.accessibleBy(ability, 'delete').where({content: args.id});
            const step = await Step.accessibleBy(ability, 'delete').where({content: args.id});
            if (page || step) {
                workflow = await Workflow.findByIdAndDelete(args.id);
            }
        }
        if (!workflow) throw new GraphQLError(errors.permissionNotGranted);
        for (const step of workflow.steps) {
            await Step.findByIdAndDelete(step.id);
            await deleteContent(step);
        }
        return workflow;
    }
}
