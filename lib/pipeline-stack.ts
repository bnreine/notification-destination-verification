import cdk from 'aws-cdk-lib'
import { PipelineType } from 'aws-cdk-lib/aws-codepipeline'
import { CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines'
import { Construct } from 'constructs';
import { ProductionStage } from './production-stage.js'

export interface PipelineStackProps extends cdk.StackProps {
    env: {
        account: string,
        region: string,
    }
}

export class PipelineStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: PipelineStackProps) {
        super(scope, id, props);


        const githubConnectionArn = cdk.Fn.importValue('GlobalGitHubConnectionArn');

        const npmSecretName = 'npm_read_write_github_access_cdk-constructs';
        const npmSecretArn = 'arn:aws:secretsmanager:us-east-1:010273536955:secret:npm_read_write_github_access_cdk-constructs-ovqlY9'

        const pipeline = new cdk.pipelines.CodePipeline(this, 'NotificationDestinationVerificationPipeline', {
            codeBuildDefaults: {
                buildEnvironment: {
                    buildImage: cdk.aws_codebuild.LinuxBuildImage.STANDARD_7_0,
                    computeType: cdk.aws_codebuild.ComputeType.MEDIUM,
                },
                partialBuildSpec: cdk.aws_codebuild.BuildSpec.fromObject({
                    version: '0.2',
                    phases: {
                        install: {
                            'runtime-versions': {
                                nodejs: 22,
                            },
                        },
                    },
                }),
            },
            pipelineName: 'NotificationDestinationVerificationPipeline',
            pipelineType: PipelineType.V2,
            selfMutation: true,
            synth: new ShellStep('Synth', {
                input: CodePipelineSource.connection('bnreine/notification-destination-verification', 'main', {
                    connectionArn: githubConnectionArn,
                    triggerOnPush: true,
                }),
                commands: ['npm ci', 'npm run build', 'npm test', 'npx cdk synth'],
            }),
            synthCodeBuildDefaults: {
                buildEnvironment: {
                    buildImage: cdk.aws_codebuild.LinuxBuildImage.STANDARD_7_0,
                    computeType: cdk.aws_codebuild.ComputeType.MEDIUM,
                    environmentVariables: {
                        NODE_OPTIONS: {
                            value: '--max-old-space-size=4096',
                        },
                        NPM_TOKEN: {
                            type: cdk.aws_codebuild
                                .BuildEnvironmentVariableType
                                .SECRETS_MANAGER,
                            value: `${npmSecretName}:NPM_TOKEN`,
                        },
                    },
                },
                rolePolicy: [
                    new cdk.aws_iam.PolicyStatement({
                        effect: cdk.aws_iam.Effect.ALLOW,
                        actions: [
                            'sts:AssumeRole',
                            'iam:PassRole',
                        ],
                        resources: ['arn:aws:iam::*:role/cdk-*'],
                    }),
                    new cdk.aws_iam.PolicyStatement({
                        effect: cdk.aws_iam.Effect.ALLOW,
                        actions: [
                            'ec2:DescribeVpcs',
                            'ec2:DescribeSubnets',
                            'ec2:DescribeRouteTables',
                            'ec2:DescribeAvailabilityZones',
                        ],
                        resources: ['*'],
                    }),
                    new cdk.aws_iam.PolicyStatement({
                        effect: cdk.aws_iam.Effect.ALLOW,
                        actions: [
                            'secretsmanager:GetSecretValue',
                        ],
                        resources: [
                            npmSecretArn,
                        ],
                    }),
                ],
            },
        });


        pipeline.addStage(
            new ProductionStage(this, 'NotificationDestinationVerificationProductionStage', {
                env: {
                    account: this.account,
                    region: this.region,
                },
            }),
        );
    }
}
