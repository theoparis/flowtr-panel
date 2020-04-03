import {ModuleMethod, RequestType} from 'paper-wrapper';
import User from '../../../database/models/User';

export class CreateUserMethod extends ModuleMethod {
    constructor() {
        super();

        this.optionalParameters = [];
        this.request = 'create';
        this.requestType = RequestType.POST;
        this.requiredParameters = [
            {name: 'username', type: 1}, // TODO: Make "STRING" when fixed in paper-wrapper
            {name: 'email', type: 1}, // TODO: Make "STRING" when fixed in paper-wrapper
            {name: 'password', type: 1}, // TODO: Make "STRING" when fixed in paper-wrapper
        ];
        this.middleware = [];
    }

    handle(request) {
        const user = new User({
            username: request.parameters.username,
            email: request.parameters.email
        });
        user.setPassword(request.parameters.password);

        // Insert a new user into the collection
        User.collection.insertOne(user).then(() => {
            request.respond(null);
        }).catch(() => {
            // TODO: Save the error somewhere
            request.error(null);
        });
    }

}