import express from 'express';
import passport from 'passport';
import { BearerStrategy } from 'passport-azure-ad';
import * as dotenv from 'dotenv';
import { User } from '../models';
dotenv.config();

// Azure Active Directory configuration
const credentials = {
    // eslint-disable-next-line no-undef
    identityMetadata: `https://login.microsoftonline.com/${process.env.tenantID}/v2.0/.well-known/openid-configuration`,
    // eslint-disable-next-line no-undef
    clientID: `${process.env.clientID}`
};

passport.use(new BearerStrategy(credentials, (token: any, done) => {
    console.log(token);
    // Checks if user already exists in the DB
    User.findOne({ $or: [{ 'oid': token.oid }, {'username': token.preferred_username }] }, (err, user) => {
        if (err) {
            return done(err);
        }

        if (user) {
            // Returns the user if found
            // return done(null, user, token);
            if (!user.oid) {
                user.name = token.name;
                user.oid = token.oid;
                user.save(err2 => {
                    if (err2) {
                        console.log(err2);
                    }
                    return done(null, user, token);
                });
            } else {
                return done(null, user, token);
            }
        } else {
            // Creates the user from azure oid if not found
            const newUser = new User();
            newUser.username = token.preferred_username;
            newUser.name = token.name;
            newUser.roles = [];
            newUser.oid = token.oid;
            newUser.save(err2 => {
                if (err2) {
                    console.log(err2);
                }
                return done(null, newUser, token);
            });
        }
    }).populate({
        // Add to the user context all roles / permissions it has
        path: 'roles',
        model: 'Role',
        populate: {
            path: 'permissions',
            model: 'Permission'
        }
    });
}));

const middleware = express();
middleware.use(passport.initialize());
middleware.use(passport.session());

export default middleware;