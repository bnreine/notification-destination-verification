import {Construct} from "constructs";
import cdk from "aws-cdk-lib";

interface NotificationDestinationVerificationLambdaStackProps  extends cdk.StackProps {
    stackName: string;
}


export class NotificationDestinationVerificationLambdaStack extends cdk.Stack {
    constructor (scope: Construct, id: string, props?: NotificationDestinationVerificationLambdaStackProps) {
        super(scope, id, props);



    }
}