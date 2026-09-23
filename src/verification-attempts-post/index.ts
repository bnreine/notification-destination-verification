export const handler = async (event: any) => {
    try {
        const userId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
        const body = JSON.parse(event.body);

        // const isValidInput = validateInput(body);
        //
        // if (!isValidInput) {
        //     return {
        //         statusCode: 400,
        //         headers: {
        //             'Content-Type': 'application/json'
        //         },
        //         body: JSON.stringify({
        //             error: {
        //                 message: 'Validation failed.',
        //                 details: validate.errors?.map((error) => error.message),
        //             },
        //         }),
        //     };
        // }


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