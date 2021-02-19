import { GraphQLNonNull, GraphQLID, GraphQLString, GraphQLError } from "graphql";
import GraphQLJSON from "graphql-type-json";
import { Form, Resource, Version } from "../../models";
import buildTypes from "../../utils/buildTypes";
import extractFields from "../../utils/extractFields";
import findDuplicates from "../../utils/findDuplicates";
import { FormType } from "../types";
import validateName from "../../utils/validateName";
import mongoose from 'mongoose';
import errors from "../../const/errors";
import { AppAbility } from "../../security/defineAbilityFor";

export default {
    /*  Finds form from its id and update it, if user is authorized.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: FormType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        structure: { type: GraphQLJSON },
        status: { type: GraphQLString },
        name: { type: GraphQLString },
        permissions: { type: GraphQLJSON }
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        if (args.name) {
            validateName(args.name);
        }
        const form = await Form.accessibleBy(ability, 'update').where({_id: args.id});
        if (!form) { throw new GraphQLError(errors.permissionNotGranted); }
        if (form.resource && args.structure) {
            const structure = JSON.parse(args.structure);
            const resource = await Resource.findById(form.resource);
            const fields = [];
            for (const page of structure.pages) {
                await extractFields(page, fields);
                findDuplicates(fields);
            }
            const oldFields = resource.fields;
            // Add new fields to the resource
            for (const field of fields) {
                const oldField = oldFields.find((x) => x.name === field.name);
                if (!oldField) {
                    oldFields.push({
                        type: field.type,
                        name: field.name,
                        resource: field.resource,
                        displayField: field.displayField,
                        isRequired: form.core && field.isRequired ? true : false,
                        core: form.core && field.isRequired ? true : false
                    });
                } else {
                    if (form.core && oldField.isRequired !== field.isRequired) {
                        oldField.isRequired = field.isRequired;
                        oldField.core = field.isRequired;
                    }
                }
            }
            if (!form.core) {
                // Check if a required field is missing
                for (const field of oldFields.filter(
                    (x) => x.isRequired === true
                )) {
                    if (
                        !fields.find(
                            (x) => x.name === field.name && x.isRequired === true
                        )
                    ) {
                        throw new GraphQLError(errors.coreFieldMissing(field.name));
                    }
                }
                // Check if there are unused fields in the resource
                const forms = await Form.find({ resource: form.resource, _id: { $ne: mongoose.Types.ObjectId(args.id) } });
                const usedFields = forms.map(x => x.fields).flat().concat(fields);
                for (let index = 0; index < oldFields.length; index++) {
                    const field = oldFields[index];
                    if (!usedFields.some(x => x.name === field.name)) {
                        oldFields.splice(index, 1);
                        index --;
                    }
                }
                await Resource.findByIdAndUpdate(form.resource, {
                    fields: oldFields,
                });
            } else {
                // Rename / Delete fields in the resource
                const forms = await Form.find({ resource: form.resource, _id: { $ne: mongoose.Types.ObjectId(args.id) } });
                const usedFields = forms.map(x => x.fields).flat().concat(fields);

                for (const field of oldFields.filter(
                    (x) => !fields.some((y) => x.name === y.name)
                )) {
                    if (usedFields.find(x => x.name === field.name)) {
                        throw new GraphQLError(errors.dataFieldCannotBeDeleted(field.name))
                    }
                }
                await Resource.findByIdAndUpdate(form.resource, {
                    oldFields
                });
            }
        }
        const version = new Version({
            createdAt: form.modifiedAt ? form.modifiedAt : form.createdAt,
            data: form.structure,
        });
        // TODO = put interface
        const update: any = {
            modifiedAt: new Date(),
            $push: { versions: version._id },
        };
        if (args.structure) {
            update.structure = args.structure;
            const structure = JSON.parse(args.structure);
            const fields = [];
            for (const page of structure.pages) {
                await extractFields(page, fields);
                findDuplicates(fields);
            }
            update.fields = fields;
        }
        if (args.status) {
            update.status = args.status;
        }
        if (args.name) {
            update.name = args.name;
        }
        if (args.permissions) {
            update.permissions = args.permissions;
        }
        await version.save();
        return Form.findByIdAndUpdate(
            args.id,
            update,
            { new: true },
            () => {
                buildTypes()
            }
        );
    },
}