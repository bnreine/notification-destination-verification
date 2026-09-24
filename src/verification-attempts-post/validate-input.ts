import {Ajv} from 'ajv';
import addFormats from 'ajv-formats';
import type { ErrorObject } from 'ajv';

const ajv = new Ajv();
// @ts-ignore
addFormats(ajv);

const schema = {
    type: "object",
    properties: {
        code: {
            "type": "string",
            "pattern": "^[0-9]{6}$"
        },
        destinationId: {
            type: "string",
            format: "uuid"
        }
    },
    required: ["destinationId", "code"],
    additionalProperties: false
};

const validate = ajv.compile(schema);

type ValidationResult = {
    isValid: boolean;
    errors: ErrorObject[] | null | undefined;
};

const validateInput =  (body: unknown): ValidationResult => {
     return {isValid: validate(body), errors: validate.errors}
}

export default validateInput;