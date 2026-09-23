import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NotificationDestinationVerificationLambdaStack } from './notification-destination-verification-lambda-stack.js';

export interface ProductionStageProps extends cdk.StageProps {
    env: {
        account: string,
        region: string,
    }
}

export class ProductionStage extends cdk.Stage {
    constructor(scope: Construct, id: string, props?: ProductionStageProps) {
        super(scope, id, props);

        new NotificationDestinationVerificationLambdaStack(this, 'NotificationDestinationVerificationLambdaStack',   {
            stackName: 'NotificationDestinationVerificationLambdaStack',
        });
    }
}
