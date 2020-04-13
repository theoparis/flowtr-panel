import {ModuleMethod, RequestType} from 'paper-wrapper';
import {AuthorizationMiddleware} from '../../middleware/AuthorizationMiddleware';
import multerUpload from '../../../files/multer';
import File from '../../../database/models/File';
import ResultError from '../../error';
import {handleMongoError} from '../../../database/mongoError';
import config from '../../../core/configurations/config';

export class UploadFileMethod extends ModuleMethod {
    constructor() {
        super();

        this.optionalParameters = [];
        this.request = 'upload-file';
        this.requestType = RequestType.POST;
        this.requiredParameters = [];
        this.middleware = [new AuthorizationMiddleware()];
    }

    _handleFile(request, file) {
        return new Promise((resolve, reject) => {

            // Create the file database model
            const fileModel = new File({
                filename: file.filename,
                fileSize: file.size,
                mimeType: file.mimetype
            });

            fileModel.setDownloadUrl(file);
            fileModel.calculateHash(file).then(() => {

                // Save the file in the database
                fileModel.save((err) => {
                    if (err) {
                        reject(
                            handleMongoError(err)
                        );
                    }
                    resolve(fileModel.toJSON());
                });
            }).catch((err) => {
                // There was an error while reading the file
                reject(
                    ResultError('FILE_NOT_FOUND', err)
                );
            });

        });
    }

    _handleFileError(err) {
        if(err.name === 'MulterError') {
            if(err.code === 'LIMIT_UNEXPECTED_FILE') {
                // Too many files uploaded
                return ResultError('TOO_MANY_FILES', err, {
                    variables: [
                        {name: 'FIELD', variable: err.field || 'unknown'}
                    ]
                });
            } else if(err.code === 'LIMIT_FILE_SIZE') {
                // The uploaded file was larger than defined in config
                return ResultError('FILE_TOO_LARGE', err);
            } else if(err.code === 'MIME_TYPE_NOT_ALLOWED') {
                // The uploaded file was larger than defined in config
                return ResultError('MIME_TYPE_NOT_ALLOWED', err);
            }

        }
        return ResultError('UNKNOWN_ERROR', err);
    }

    handle(request) {
        const upload = multerUpload.fields([
            {name: 'files', maxCount: config.max_upload_files}
        ]);
        return upload(request.request, request.response, async (err) => {
            if(err) return request.error(
                this._handleFileError(err)
            );

            // Grab the files out of the "files" field
            const files = request.request.files.files;

            if(Array.isArray(files)) {
                const fileResults = [];

                // Handle all files in the request
                for(const file of files) {

                    // Uses await so the files will be handled in sequence
                    await this._handleFile(request, file).then((fileResult) => {
                        fileResults.push(fileResult);
                    }).catch((err) => {
                        request.error(err);
                    });
                }

                // Send all file results back to the client
                request.respond(fileResults);
            } else {
                return request.error(
                    ResultError('NO_FILES_UPLOADED')
                );
            }

        });
    }

}