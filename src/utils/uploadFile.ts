import { BlobServiceClient }from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import FileType from 'file-type';
import { GraphQLError } from 'graphql';
import errors from '../const/errors';
dotenv.config();

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

const ALLOWED_EXTENSIONS = ['xlsx', 'xls', 'csv', 'pdf', 'jpg', 'jpeg', 'png'];

export default async (file: any, form: string) => {
    const { createReadStream } = file;
    const fileType = await FileType.fromStream(createReadStream());
    if (!fileType || !ALLOWED_EXTENSIONS.includes(fileType.ext)) {
        throw new GraphQLError(errors.fileExtensionNotAllowed);
    }
    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(form);
        if (!await containerClient.exists()) {
            await containerClient.create();
        }
        const blobName = uuidv4();
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const fileStream = createReadStream();
        await blockBlobClient.uploadStream(fileStream);
        return `${form}/${blobName}`;
    } catch {
        throw new GraphQLError(errors.fileCannotBeUploaded);
    }
};