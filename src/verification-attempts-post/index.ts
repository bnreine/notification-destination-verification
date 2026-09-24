// @ts-ignore provided by lambda at runtime
import { getDbPool } from '/opt/nodejs/db/connection.js';
import validateInput from './validate-input.js'


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



        return {
            statusCode: 201,
            headers: {
                // 'Location': resourceHref,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({hello: 'world'}),
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