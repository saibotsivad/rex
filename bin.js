#!/usr/bin/env node

const { execSync } = require('child_process')
const { readFileSync, writeFileSync } = require('fs')
const { version } = require('./package.json')
const Conf = require('conf')
const mkdirp = require('mkdirp')
const path = require('path')
const sade = require('sade')
const SQS = require('aws-sdk/clients/sqs')
const uuid = require('just-uuid4')

const prog = sade('rex')
const config = new Conf()

const commandRegex = /[a-zA-Z0-9_-]/
const TEMP_FOLDER = '/tmp/remote-execute'

const assertCommandNameIsSafe = name => {
	if (!commandRegex.test(name)) {
		console.log(`Allowed characters for command names are ${commandRegex.toString()}`)
		process.exit(1)
	}
}

const execute = async (script, payloadPathFilename) => {
	execSync(`"${script}" "${payloadPathFilename}"`)
}

const exit = (status, message) => {
	console.log(message)
	process.exit(status)
}

const getSqsInstance = () => {
	const region = process.env.REMOTE_EXECUTE_AWS_REGION
	const accessKeyId = process.env.REMOTE_EXECUTE_AWS_ACCESS_KEY_ID
	const secretAccessKey = process.env.REMOTE_EXECUTE_AWS_SECRET_ACCESS_KEY

	if (!region || !accessKeyId || !secretAccessKey) {
		exit(1, 'AWS credentials are not configured correctly.')
	}

	const QueueUrl = config.get('sqsUrl')
	if (!QueueUrl) {
		exit(1, 'No SQS queue URL configured.')
	}

	return {
		QueueUrl,
		sqs: new SQS({ region, accessKeyId, secretAccessKey })
	}
}

prog
	.version(version)
	.describe('Set up this computer to accept remote execution, using messages passed through AWS SQS. For more information, see: https://github.com/saibotsivad/remote-execute')

prog
	.command('start')
	.describe('Start listening for execution commands.')
	.action(() => {
		try {
			const { QueueUrl, sqs } = getSqsInstance()
			const params = {
				QueueUrl,
				MaxNumberOfMessages: 1,
				AttributeNames: [ 'All' ]
			}
			// TODO listen forever
			sqs.receiveMessage(params, (error, data) => {
				if (error) {
					console.error(error)
					exit(1, 'Error while attempting to receive SQS messages.')
				}
				if (!data.Messages || !data.Messages.length) {
					exit(1, 'No messages found on queue.')
				}
				try {
					const name = data.Messages[0].Attributes.MessageGroupId
					const payload = data.Messages[0].Body
					const tempFolder = config.get('tempFolder') || TEMP_FOLDER
					mkdirp.sync(tempFolder)
					const payloadPathFilename = path.join(tempFolder, `${new Date().getTime()}-${uuid()}`)
					if (payload) {
						writeFileSync(payloadPathFilename, payload, { encoding: 'utf8' })
					}
					const script = config.get(`commands.${name}`)
					if (!script) {
						exit(1, `Received an unrecognized command: ${name} => ${payloadPathFilename || '(no payload)'}`)
					}
					execute(script, payloadPathFilename)
						.then(() => {
							exit(0, `Executed command successfully: ${name}`)
						})
						.catch(error => {
							exit(1, `Command ececution failed: ${name}`)
						})
				} catch (error) {
					console.error(error)
					exit(1, 'Could not parse SQS body data.')
				}
			})

		} catch (error) {
			console.error(error)
			exit(1, 'Unexpected failure during startup.')
		}
	})

prog
	.command('add <name> <script>')
	.describe(`Add an executable command. Allowed characters are ${commandRegex.toString()} start and end characters may not be dashes or underscores. When a request is received to execute this command, this service will execute <script> with an optional path to a temporary file containing any properties passed in with the execution request.`)
	.action((name, script) => {
		assertCommandNameIsSafe(name)
		config.set(`commands.${name}`, script)
		exit(0, `Added command: ${name} => "${script}"`)
	})

prog
	.command('rm <name>')
	.describe('Remove an executable command.')
	.action(name => {
		assertCommandNameIsSafe(name)
		config.delete(`commands.${name}`)
		exit(0, `Removed command: ${name}`)
	})

prog
	.command('ls')
	.describe('List all executable commands.')
	.action(() => {
		const commands = config.get('commands') || {}
		Object
			.keys(commands)
			.forEach(key => {
				console.log(`${key} => ${commands[key]}`)
			})
	})

prog
	.command('sqs <url>')
	.describe(`Set the SQS queue URL. Queue URLs are case-sensitive.`)
	.action(url => {
		config.set('sqsUrl', url)
		exit(0, `Set SQS queue URL: "${url}"`)
	})

prog
	.command('tmp [folder]')
	.describe(`Set the folder to store payloads. Leave blank to revert to default: ${TEMP_FOLDER}`)
	.action(folder => {
		if (folder) {
			config.set('tempFolder', folder)
			exit(0, `Payload temporary folder set: ${folder}`)
		} else {
			config.delete('tempFolder')
			exit(0, `Payload temporary folder reverted to default: ${TEMP_FOLDER}`)
		}
	})

prog
	.command('run <name> [payload]')
	.describe('Execute a command manually. Optionally, pass along a filepath to a payload.')
	.action((name, payload) => {
		assertCommandNameIsSafe(name)
		const script = config.get(`commands.${name}`)
		if (!script) {
			exit(1, `Could not locate command: ${name}`)
		}
		execute(script, payload)
			.then(() => {
				exit(0, `Executed command successfully: ${name}`)
			})
			.catch(error => {
				exit(1, `Command ececution failed: ${name}`)
			})
	})

prog
	.command('push <name> [payload]')
	.describe('Push a command through SQS. This will post an execution request to an SQS queue, which your service should detect and then execute. Optionally, pass along the path to the JSON payload.')
	.action((name, payload) => {
		assertCommandNameIsSafe(name)
		const { QueueUrl, sqs } = getSqsInstance()

		const message = {
			QueueUrl,
			MessageGroupId: name,
			MessageDeduplicationId: uuid()
		}

		if (payload) {
			try {
				message.MessageBody = readFileSync(payload, { encoding: 'utf8' })
			} catch (ignore) {
				exit(1, `Could not read payload file: ${payload}`)
			}
		}

		sqs.sendMessage(message, (error, data) => {
			if (error) {
				console.error(error)
				exit(1, `Failed to push to SQS queue: ${QueueUrl}`)
			} else {
				exit(0, `Successfully pushed to SQS queue: ${QueueUrl}`)
			}
		})
	})

prog.parse(process.argv)
