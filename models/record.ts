import mongoose, { Schema, Document } from 'mongoose';

const recordSchema = new Schema({
    form: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Form',
        required: true
    },
    resource: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resource',
        required: false
    },
    createdAt: Date,
    modifiedAt: Date,
    deleted: {
        type: Boolean,
        default: false
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    versions: {
        type: [mongoose .Schema.Types.ObjectId],
        ref: 'Version'
    }
});

export interface Record extends Document {
    form: any;
    resource: any;
    createdAt: Date;
    modifiedAt: Date;
    deleted: boolean;
    data: any;
    versions: any;
}

export const Record = mongoose.model<Record>('Record', recordSchema);