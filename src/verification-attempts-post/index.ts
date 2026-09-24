// @ts-ignore provided by lambda at runtime
import { getDbPool } from '/opt/nodejs/db/connection.js';
import validateInput from './validate-input.js'
import twilio from "twilio";
import {
    GetSecretValueCommand,
    SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

const secretsManager = new SecretsManagerClient({});

let twilioClient

async function getTwilioClient() {
    if (twilioClient) {
        return twilioClient;
    }

    const response = await secretsManager.send(
        new GetSecretValueCommand({
            SecretId: process.env.TWILIO_VERIFY_SECRET_NAME
        })
    );

    if (!response.SecretString) {
        throw new Error(`Secret ${process.env.TWILIO_VERIFY_SECRET_NAME} has no SecretString`);
    }

    const secret = JSON.parse(response.SecretString);

    twilioClient = twilio(
        secret.sid,
        secret.clientSecret,
        {
            accountSid: process.env.TWILIO_ACCOUNT_SID,
        }
    );


    return twilioClient;
}


export const handler = async (event: any) => {
    try {
        const userId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
        const body = JSON.parse(event.body);
        const destinationId = event.pathParameters?.destinationId;

        const {isValid, errors} = validateInput({destinationId, ...body});

        if (!isValid) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    error: {
                        message: 'Validation failed.',
                        details: errors?.map((error) => error.message),
                    },
                }),
            };
        }

        const dbPool = await getDbPool('write_read_rds_db');

        const destinationDeleteResponse = await dbPool.query(
            `Select * FROM "Destination" WHERE "userId" = $1 AND "id" = $2 AND "deleted" is not true AND "channelType"=$3`,
            [userId, destinationId, 'sms'] // only sms supported for now
        );

        if (destinationDeleteResponse.rows.length === 0) {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    error: {
                        message: 'Not found.',
                    },
                }),
            };
        }

        const twilioClient = await getTwilioClient();

        const {code} = body

        const verificationCheck = await twilioClient.verify.v2
            .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
            .verificationChecks.create({
                to: destinationDeleteResponse.rows[0].metadata.phoneNumber,
                code: code,
            });

        let result
        if (verificationCheck.status === 'approved') {
            result = 'correct'
        } else {
            result = 'incorrect'
        }


        return {
            statusCode: 201,
            headers: {
                // 'Location': resourceHref,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({correct: result}),
        };

    } catch (err: any) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                error: { message: err.message },
            }),
        };
    }


}