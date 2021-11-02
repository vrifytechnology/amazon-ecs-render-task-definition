const run = require('.');
const core = require('@actions/core');
const tmp = require('tmp');
const fs = require('fs');

jest.mock('@actions/core');
jest.mock('tmp');
jest.mock('fs');

describe('Render task definition', () => {

    beforeEach(() => {
        jest.clearAllMocks();

        core.getInput = jest
            .fn()
            .mockReturnValueOnce('task-definition.json') // task-definition
            .mockReturnValueOnce('web')                  // container-name
            .mockReturnValueOnce('nginx:latest')
            .mockReturnValueOnce('log-group')
            .mockReturnValueOnce('service-family')
            .mockReturnValueOnce('[ "DJANGO_ACCOUNT_ALLOW_REGISTRATION", "DJANGO_ADMIN_URL", "DJANGO_AWS_REGION_NAME", "DJANGO_AWS_S3_CUSTOM_DOMAIN", "DJANGO_AWS_STORAGE_BUCKET_NAME", "DJANGO_SECURE_SSL_REDIRECT", "DJANGO_SENTRY_LOG_LEVEL", "DJANGO_SENTRY_SAMPLE_RATE", "DJANGO_SETTINGS_MODULE", "MYSQL_DATABASE", "MYSQL_HOST", "MYSQL_PORT", "REDIS_URL", "SENTRY_DSN", "VRIFY_CDN_URL", "WEB_CONCURRENCY", "SOCIAL_AUTH_APPLE_ID_CLIENT", "SOCIAL_AUTH_APPLE_ID_AUDIENCE", "WEBAPP_ENDPOINT", "VPEAPP_ENDPOINT", "API_ENDPOINT", "CRONOFY_CLIENT_ID", "ENVIRONMENT", "MIXPANEL_API_KEY", "AMPLITUDE_API_KEY"]')
            .mockReturnValueOnce('nginx:latest')         // image
            .mockReturnValueOnce('FOO=bar\nHELLO=world') // environment-variables
            .mockReturnValueOnce('nginx:latest')
            .mockReturnValueOnce('log-group')
            .mockReturnValueOnce('service-family')
            .mockReturnValueOnce('["RUNNER_TEMP"]');

        process.env = Object.assign(process.env, { GITHUB_WORKSPACE: __dirname });
        process.env = Object.assign(process.env, { RUNNER_TEMP: '/home/runner/work/_temp' });

        tmp.fileSync.mockReturnValue({
            name: 'new-task-def-file-name'
        });

        fs.existsSync.mockReturnValue(true);

        jest.mock('./task-definition.json', () => ({
            family: 'task-def-family',
            containerDefinitions: [
                {
                    name: "web",
                    image: "some-image",
                    logConfiguration: {
                        options: {
                            "awslogs-group": "",
                        },
                    },
                    environment: [
                        {
                            name: "FOO",
                            value: "not bar"
                        },
                        {
                            name: "DONT-TOUCH",
                            value: "me"
                        }
                    ],
                    logConfiguration: {
                        options: {
                            "awslogs-group": "",
                        },
                    },
                    environment: [{name:"RUNNER_TEMP", value: "/home/runner/work/_temp"}]
                },
                {
                    name: "sidecar",
                    image: "hello",
                    logConfiguration: {
                        options: {
                            "awslogs-group": "",
                        },
                    },
                    environment: [{name:"RUNNER_TEMP", value: "/home/runner/work/_temp"}]
                }
            ]
        }), { virtual: true });
    });

    test('renders the task definition and creates a new task def file', async () => {
        await run();
        expect(tmp.fileSync).toHaveBeenNthCalledWith(1, {
            tmpdir: '/home/runner/work/_temp',
            prefix: 'task-definition-',
            postfix: '.json',
            keep: true,
            discardDescriptor: true
          });
        expect(fs.writeFileSync).toHaveBeenNthCalledWith(1, 'new-task-def-file-name',
            JSON.stringify({
                family: 'service-family',
                containerDefinitions: [
                    {
                        name: "web",
                        image: "nginx:latest",
                        logConfiguration: {
                            options: {
                                "awslogs-group": "log-group",
                            },
                        },
                        environment: [
                            {
                                name: "FOO",
                                value: "bar"
                            },
                            {
                                name: "DONT-TOUCH",
                                value: "me"
                            },
                            {
                                name: "HELLO",
                                value: "world"
                            }
                        ],
                        logConfiguration: {
                            options: {
                                "awslogs-group": "log-group",
                            },
                        },
                        environment: [{name:"RUNNER_TEMP", value: "/home/runner/work/_temp"}]
                    },
                    {
                        name: "sidecar",
                        image: "hello",
                        logConfiguration: {
                            options: {
                                "awslogs-group": "",
                            },
                        },
                        environment: [{name:"RUNNER_TEMP", value: "/home/runner/work/_temp"}]
                    }
                ]
            }, null, 2)
        );
        expect(core.setOutput).toHaveBeenNthCalledWith(1, 'task-definition', 'new-task-def-file-name');
    });

    test('renders a task definition at an absolute path, and with initial environment empty', async () => {
        core.getInput = jest
            .fn()
            .mockReturnValueOnce('/hello/task-definition.json') // task-definition
            .mockReturnValueOnce('web')                  // container-name
            .mockReturnValueOnce('nginx:latest')
            .mockReturnValueOnce('log-group')
            .mockReturnValueOnce('service-family')
            .mockReturnValueOnce('["RUNNER_TEMP"]')
            .mockReturnValueOnce('nginx:latest')         // image
            .mockReturnValueOnce('EXAMPLE=here')        // environment-variables
            .mockReturnValueOnce('nginx:latest')
            .mockReturnValueOnce('log-group')
            .mockReturnValueOnce('service-family')
            .mockReturnValueOnce('["RUNNER_TEMP"]');
        jest.mock('/hello/task-definition.json', () => ({
            family: 'task-def-family',
            containerDefinitions: [
                {
                    name: "web",
                    image: "some-other-image",
                    logConfiguration: {
                        options: {
                            "awslogs-group": "",
                        },
                    },
                    environment: [{name:"RUNNER_TEMP", value: ""}]
                }
            ]
        }), { virtual: true });

        await run();

        expect(tmp.fileSync).toHaveBeenNthCalledWith(1, {
            tmpdir: '/home/runner/work/_temp',
            prefix: 'task-definition-',
            postfix: '.json',
            keep: true,
            discardDescriptor: true
          });
        expect(fs.writeFileSync).toHaveBeenNthCalledWith(1, 'new-task-def-file-name',
            JSON.stringify({
                family: 'service-family',
                containerDefinitions: [
                    {
                        name: "web",
                        image: "nginx:latest",
                        logConfiguration: {
                            options: {
                                "awslogs-group": "log-group",
                            },
                        },
                        environment: [
                            {
                                name: "EXAMPLE",
                                value: "here"
                            }
                        ],
                        logConfiguration: {
                            options: {
                                "awslogs-group": "log-group",
                            },
                        },
                        environment: [{name:"RUNNER_TEMP", value: "/home/runner/work/_temp"}]
                    }
                ]
            }, null, 2)
        );
        expect(core.setOutput).toHaveBeenNthCalledWith(1, 'task-definition', 'new-task-def-file-name');
    });

    test('error returned for missing task definition file', async () => {
        fs.existsSync.mockReturnValue(false);
        core.getInput = jest
            .fn()
            .mockReturnValueOnce('does-not-exist-task-definition.json')
            .mockReturnValueOnce('web')
            .mockReturnValueOnce('nginx:latest')
            .mockReturnValueOnce('log-group')
            .mockReturnValueOnce('service-family')
            .mockReturnValueOnce('["RUNNER_TEMP", "GITHUB_WORKSPACE"]');

        await run();

        expect(core.setFailed).toBeCalledWith('Task definition file does not exist: does-not-exist-task-definition.json');
    });

    test('error returned for non-JSON task definition contents', async () => {
        jest.mock('./non-json-task-definition.json', () => ("hello"), { virtual: true });

        core.getInput = jest
            .fn()
            .mockReturnValueOnce('non-json-task-definition.json')
            .mockReturnValueOnce('web')
            .mockReturnValueOnce('nginx:latest')
            .mockReturnValueOnce('log-group')
            .mockReturnValueOnce('service-family')
            .mockReturnValueOnce('["RUNNER_TEMP", "GITHUB_WORKSPACE"]');

        await run();

        expect(core.setFailed).toBeCalledWith('Invalid task definition format: containerDefinitions section is not present or is not an array');
    });

    test('error returned for malformed task definition with non-array container definition section', async () => {
        jest.mock('./malformed-task-definition.json', () => ({
            family: 'task-def-family',
            containerDefinitions: {}
        }), { virtual: true });

        core.getInput = jest
            .fn()
            .mockReturnValueOnce('malformed-task-definition.json')
            .mockReturnValueOnce('web')
            .mockReturnValueOnce('nginx:latest')
            .mockReturnValueOnce('log-group')
            .mockReturnValueOnce('service-family')
            .mockReturnValueOnce('["RUNNER_TEMP", "GITHUB_WORKSPACE"]');

        await run();

        expect(core.setFailed).toBeCalledWith('Invalid task definition format: containerDefinitions section is not present or is not an array');
    });

    test('error returned for task definition without matching container name', async () => {
        jest.mock('./missing-container-task-definition.json', () => ({
            family: 'task-def-family',
            containerDefinitions: [
                {
                    name: "main",
                    image: "some-other-image"
                }
            ]
        }), { virtual: true });

        core.getInput = jest
            .fn()
            .mockReturnValueOnce('missing-container-task-definition.json')
            .mockReturnValueOnce('web')
            .mockReturnValueOnce('nginx:latest')
            .mockReturnValueOnce('log-group')
            .mockReturnValueOnce('service-family')
            .mockReturnValueOnce('["RUNNER_TEMP", "GITHUB_WORKSPACE"]');

        await run();

        expect(core.setFailed).toBeCalledWith('Invalid task definition: Could not find container definition with matching name');
    });
});
