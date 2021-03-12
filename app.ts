import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authMiddleware from './middlewares/auth';
import graphqlMiddleware from './middlewares/graphql';
import errors from './const/errors';
import { ApolloServer, AuthenticationError, mergeSchemas } from 'apollo-server-express';
import schema from './schema';
import { createServer, Server } from 'http';
import { User } from './models';
import jwt_decode from 'jwt-decode';
import pubsub from './server/pubsub';
import buildSchema from './utils/buildSchema';
import { GraphQLSchema } from 'graphql';
import fs from 'fs';
import * as dotenv from 'dotenv';
import subscriberSafe from './server/subscriberSafe';
import buildTypes from './utils/buildTypes';
dotenv.config();

if (process.env.DB_PREFIX === 'mongodb+srv') {
    mongoose.connect(
        `${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`, {
        useCreateIndex: true,
        useNewUrlParser: true,
        autoIndex: true
    });
} else {
    mongoose.connect(`${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.APP_NAME}@`);
}

mongoose.connection.once('open', () => {
    console.log('📶 Connected to database');
    subscriberSafe();
});

/*  For CORS, ALLOWED-ORIGINS param of .env file should have a format like that:
    ALlOWED_ORIGINS="<origin-1>, <origin-2>"
    Ex:
    ALLOWED_ORIGINS="http://localhost:4200, http://localhost:3000"
*/
// eslint-disable-next-line no-undef
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(', ');

let app: any;
let httpServer: Server;
let apolloServer: ApolloServer;

const launchServer = (apiSchema: GraphQLSchema) => {
    const PORT = 3000;
    app = express();

    httpServer = createServer(app);

    app.use(cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (allowedOrigins.indexOf(origin) === -1) {
                const msg = errors.invalidCORS;
                return callback(new Error(msg), false);
            }
            return callback(null, true);
        }
    }));

    app.use(authMiddleware);
    app.use('/graphql', graphqlMiddleware);

    apolloServer = new ApolloServer({
        schema: apiSchema,
        subscriptions: {
            onConnect: (connectionParams: any, webSocket: any) => {
                if (connectionParams.authToken) {
                    const token: any = jwt_decode(connectionParams.authToken);
                    return User.findOne({ 'oid': token.oid }).populate({
                        // Add to the user context all roles / permissions it has
                        path: 'roles',
                        model: 'Role',
                        populate: {
                            path: 'permissions',
                            model: 'Permission'
                        },
                    });
                } else {
                    throw new AuthenticationError('No token');
                }
            },
        },
        context: async ({ req, connection }) => {
            if (connection) {
                return {
                    user: connection.context,
                    pubsub: await pubsub()
                };
            }
            if (req) {
                return {
                    // not a clean fix but that works for now
                    user: (req as any).user
                };
            }
        }
    });

    apolloServer.applyMiddleware({
        app
    });

    httpServer = createServer(app);

    apolloServer.installSubscriptionHandlers(httpServer);

    httpServer.listen(PORT, () => {
        console.log(`🚀 Server ready at http://localhost:${PORT}${apolloServer.graphqlPath}`);
        console.log(`🚀 Server ready at ws://localhost:${PORT}${apolloServer.subscriptionsPath}`);
    });
}


buildTypes()
    .finally(() => {

        buildSchema()
            .then((builtSchema: GraphQLSchema) => {
                const graphQLSchema = mergeSchemas({
                    schemas: [
                        schema,
                        builtSchema
                    ]
                });
                launchServer(graphQLSchema);
            })
            .catch((err) => {
                console.error(err);
                launchServer(schema);
            });

        fs.watchFile('schema.graphql', (curr, prev) => {
            if (!curr.isFile()) {
                console.log('📝 Create schema.graphql')
                fs.writeFile('schema.graphql', '', err => {
                    if (err) {
                        throw err;
                    } else {
                        buildTypes();
                    }
                });
            } else {
                console.log('🔨 Rebuilding schema');
                buildSchema()
                    .then((builtSchema: GraphQLSchema) => {
                        console.log('🛑 Stopping server');
                        httpServer.removeListener('request', app);
                        httpServer.close();
                        apolloServer.stop().then(() => {
                            console.log('🔁 Reloading server');
                            launchServer(builtSchema);
                        })
                    })
                    .catch((err) => {
                        console.error(err);
                    });
            }
        });
    });
