import {Construct} from "constructs";
import cdk from "aws-cdk-lib";
import { Duration, aws_ec2 } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { LambdaRouteConnection } from '@bnreine/cdk-constructs';
import { Stack } from 'aws-cdk-lib'
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as lambda from "aws-cdk-lib/aws-lambda";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_GATEWAY_ID_SSM_PARAMETER = '/notifications/apigateway/api2/id';


interface NotificationDestinationVerificationLambdaStackProps  extends cdk.StackProps {
    stackName: string;
}


export class NotificationDestinationVerificationLambdaStack extends cdk.Stack {
    constructor (scope: Construct, id: string, props?: NotificationDestinationVerificationLambdaStackProps) {
        super(scope, id, props);

        const vpc = aws_ec2.Vpc.fromLookup(this, 'Vpc', {
            vpcId: 'vpc-084bacc70db0dcefd',
        });


        const rdsSgId = ssm.StringParameter.valueForStringParameter(
            this,
            '/notifications/rds-sg-id'
        );

        const rdsSg = aws_ec2.SecurityGroup.fromSecurityGroupId(
            this,
            'RdsSg',
            rdsSgId,
            { mutable: true }
        );


        const apiId = ssm.StringParameter.valueForStringParameter(
            this,
            API_GATEWAY_ID_SSM_PARAMETER,
        );

        const defaultAuthorizerId = ssm.StringParameter.valueForStringParameter(
            this,
            "/notifications/apigateway/api2/default-authorizer-id"
        );

        const defaultAuthorizerType = ssm.StringParameter.valueForStringParameter(
            this,
            "/notifications/apigateway/api2/default-authorizer-type"
        );

        const sharedLayerArn =
            ssm.StringParameter.valueForStringParameter(
                this,
                "/notifications/shared-layer/arn"
            );

        const sharedLayer =
            lambda.LayerVersion.fromLayerVersionArn(
                this,
                "SharedLayer",
                sharedLayerArn
            );


        const verificationAttemptsPostLambdaDir = path.join(__dirname, '../src/verification-attempts-post');



        const lambdaSecurityGroup = new aws_ec2.SecurityGroup(this, 'NotificationDestinationVerificationLambdaSecurityGroup', {
            vpc,
            description: 'Security group for Notification Destination Verification Lambda functions',
            allowAllOutbound: true, // Allows the Lambda to initiate connections (e.g. to RDS)
        });

        const attemptsPostLambda = new NodejsFunction(this, 'NotificationDestinationVerificationAttemptsPostLambda', {
            runtime: Runtime.NODEJS_22_X,
            entry: path.join(verificationAttemptsPostLambdaDir, 'index.js'),
            handler: 'handler',
            timeout: Duration.seconds(29),
            projectRoot: verificationAttemptsPostLambdaDir,
            depsLockFilePath: path.join(verificationAttemptsPostLambdaDir, 'package-lock.json'),
            layers: [sharedLayer],
            bundling: {
                externalModules: ['/opt/*'],
                format: OutputFormat.ESM,
            },
            vpc,
            vpcSubnets: {
                subnetType: aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            securityGroups: [lambdaSecurityGroup],
            environment: {
                // NODE_ENV: "sam-local",
            }
        });

        const writeReadRDSdbSecret = secretsmanager.Secret.fromSecretNameV2(
            this,
            'DbSecret',
            'write_read_rds_db',
        );


        const twilioVerifySecret = secretsmanager.Secret.fromSecretNameV2(
            this,
            'TwilioVerifySecret',
            'otp-verify-twilio',
        );

        writeReadRDSdbSecret.grantRead(attemptsPostLambda);
        twilioVerifySecret.grantRead(attemptsPostLambda);

        new LambdaRouteConnection(this, 'NotificationDestinationVerificationAttemptsPostRoute', {
            lambdaFunction: attemptsPostLambda,
            region: this.region,
            apiId,
            routeKey: 'GET /destinations/{destinationId}/verification-attempts',
            authorizationType: defaultAuthorizerType,
            authorizerId: defaultAuthorizerId,
        });





        rdsSg.addIngressRule(
            lambdaSecurityGroup,
            aws_ec2.Port.tcp(5432),
            "Allow Lambda to connect"
        );

    }
}