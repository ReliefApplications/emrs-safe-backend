import { GraphQLObjectType } from 'graphql';
import notification from './notification';
import formUnlocked from './formUnlocked';
import recordAdded from './recordAdded';

// === SUBSCRIPTIONS ===
const Subscription = new GraphQLObjectType({
    name: 'Subscription',
    fields: {
        notification,
        formUnlocked,
        recordAdded
    }
});

export default Subscription;
