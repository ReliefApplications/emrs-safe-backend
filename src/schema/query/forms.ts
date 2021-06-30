import { GraphQLError, GraphQLList } from 'graphql';
import { FormType } from '../types';
import { Form } from '../../models';
import errors from '../../const/errors';
import { AppAbility } from '../../security/defineAbilityFor';

export default {
    /*  List all forms available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(FormType),
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        return Form.accessibleBy(ability, 'read');
    },
}
