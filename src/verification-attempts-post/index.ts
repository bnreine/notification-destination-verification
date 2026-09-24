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

        const destinationResponse = await dbPool.query(
            `Select d.* FROM "Destination" as d left join "Verify" as v on v."destinationId"=d."id" WHERE "userId" = $1 AND d."id" = $2 AND d."deleted" is not true AND d."channelType"=$3 AND v."status"='pending'`,
            [userId, destinationId, 'sms'] // only sms supported for now
        );

        if (destinationResponse.rows.length === 0 || userId !== '44085488-0091-707c-2208-9b6753027a15') {
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
                to: destinationResponse.rows[0].metadata.phoneNumber,
                code: code,
            });

        let result
        if (verificationCheck.status === 'approved') {
            result = 'correct'
        } else {
            result = 'incorrect'
        }



        // const client = await dbPool.connect();
        // try {
        //     await client.query('BEGIN');
        //
        //     const verifyId = randomUUID();
        //
        //     await client.query(
        //         `INSERT INTO "Verify" ("id",
        //                                "destinationId",
        //                                "status",
        //                                "createdAt",
        //                                "updatedAt",
        //                                "provider",
        //                                "providerId")
        //          VALUES ($1,
        //                  $2,
        //                  $3,
        //                  $4,
        //                  $5,
        //                  $6,
        //                  $7) ON CONFLICT ("destinationId")
        //     DO
        //         UPDATE SET
        //             "status" = EXCLUDED."status",
        //             "updatedAt" = EXCLUDED."updatedAt"`, [verifyId, destinationId, 'pending', now, now, "twilio",verification.sid]
        //     );
        //
        //     const verifyEventId = randomUUID();
        //
        //     await client.query(
        //         `INSERT INTO "VerifyEvent" ("id", "verifyId", "status", "createdAt")
        //          VALUES ($1, $2, $3, $4)`,
        //         [verifyEventId, verifyId, 'sent', now]
        //     );
        //
        //     await client.query('COMMIT');
        //     // destinationResource.verifyStatus = 'pending'
        //     // returnResource =hal(destinationResource).addLink('self', resourceHref).addLink('verificationChallenge', `${resourceHref}/verification-challenges`).addLink('verificationAttempt', `${resourceHref}/verification-attempts`);
        //
        // } catch (err) {
        //     await client.query('ROLLBACK');
        //     throw err;
        // } finally {
        //     client.release();
        // }




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