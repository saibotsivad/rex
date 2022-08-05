import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import timers from 'node:timers/promises'

import promiseForever from 'p-forever'
import sade from 'sade'
import AWS from 'aws-sdk'
import uuid from 'just-uuid4'

import { config } from './config.js'

const version = '__VERSION__'

const prog = sade('rex')

const COMMAND_REGEX = /[a-zA-Z0-9_-]/
const SECONDS_DELAY_FOR_ERROR = 10
const TEMP_FOLDER = '/tmp/remote-execute'

const delay = async millis => timers.setTimeout(millis)

const assertCommandNameIsSafe = name => {
	if (!COMMAND_REGEX.test(name)) {
		console.log(`Allowed characters for command names are ${COMMAND_REGEX.toString()}`)
		process.exit(1)
	}
}

const execute = async (script, payloadPathFilename) => {
	execSync(`"${script}" "${payloadPathFilename}"`)
}

const exit = (status, message) => {
	if (message) {
		console.log(message)
	}
	process.exit(status)
}

const getSqsInstance = () => {
	const QueueUrl = config.get('sqsUrl')
	if (!QueueUrl) {
		exit(1, 'No SQS queue URL configured.')
	}

	let sqs

	const region = process.env.REX_AWS_REGION
	const accessKeyId = process.env.REX_AWS_ACCESS_KEY_ID
	const secretAccessKey = process.env.REX_AWS_SECRET_ACCESS_KEY
	if (region || accessKeyId || secretAccessKey) {
		if (!region || !accessKeyId || !secretAccessKey) {
			exit(1, 'AWS credentials are not configured correctly.')
		}
		sqs = new AWS.SQS({ region, accessKeyId, secretAccessKey })
	} else if (config.get('awsprofile')) {
		AWS.config.credentials = new AWS.SharedIniFileCredentials({
			profile: config.get('awsprofile')
		})
		sqs = new AWS.SQS()
	} else {
		sqs = new AWS.SQS()
	}

	return { QueueUrl, sqs }
}

const writePayload = message => {
	const hasPayload = message.Body
		&& message.MessageAttributes
		&& message.MessageAttributes.HasBody
		&& message.MessageAttributes.HasBody.StringValue === 'true'
	if (hasPayload) {
		const tempFolder = config.get('tempFolder') || TEMP_FOLDER
		mkdirSync(tempFolder, { recursive: true })
		const filename = join(tempFolder, `${new Date().getTime()}-${uuid()}`)
		writeFileSync(filename, message.Body, { encoding: 'utf8' })
		return filename
	}
	return undefined
}

const watchQueue = async () => {
	try {
		const { QueueUrl, sqs } = getSqsInstance()
		const params = {
			QueueUrl,
			MaxNumberOfMessages: 1,
			AttributeNames: [ 'All' ],
			MessageAttributeNames: [ 'All' ],
			WaitTimeSeconds: 20
		}
		const data = await sqs.receiveMessage(params).promise()
		if (data.Messages && data.Messages.length) {
			const name = data.Messages[0].Attributes.MessageGroupId
			const script = config.get(`commands.${name}`)

			if (!script) {
				console.error(`Received an unrecognized command: ${name}`)
			} else {
				const payloadPathFilename = writePayload(data.Messages[0])
				try {
					await execute(script, payloadPathFilename)
					console.log(`Executed command successfully: ${name}`)
				} catch (error) {
					console.error(`Command execution failed: ${name}`)
				}

			}

			try {
				const ReceiptHandle = data.Messages[0].ReceiptHandle
				await sqs.deleteMessage({ QueueUrl, ReceiptHandle }).promise()
			} catch (error) {
				console.error('Error while marking command as received.', error)
			}
		}
		console.log('')
	} catch (error) {
		console.error(`Unexpected error while fetching commands. Waiting ${SECONDS_DELAY_FOR_ERROR} seconds to retry.`, error)
		await delay(SECONDS_DELAY_FOR_ERROR * 1000)
	}
}

prog
	.version(version)
	.describe('Set up this computer to accept remote execution, using messages passed through AWS SQS. For more information, see: https://github.com/saibotsivad/remote-execute')

prog
	.command('config-path')
	.describe('Get the path to the configuration file.')
	.action(() => {
		console.log(config.path())
	})

prog
	.command('listen')
	.describe('Start listening for execution commands.')
	.action(() => {
		console.log('Listening for execution commands...')
		promiseForever(watchQueue)
			.then(() => {
				exit(0, 'Done watching for commands.')
			})
			.catch(error => {
				console.error(error)
				exit(1, 'An unrecoverable error occurred while watching for commands.')
			})
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
			MessageDeduplicationId: `${new Date().getTime()}-${uuid()}`,
			MessageAttributes: {
				HasBody: {
					DataType: 'String',
					StringValue: payload
						? 'true'
						: 'false'
				}
			}
		}

		if (payload) {
			try {
				message.MessageBody = readFileSync(payload, { encoding: 'utf8' })
			} catch (ignore) {
				exit(1, `Could not read payload file: ${payload}`)
			}
		} else {
			message.MessageBody = name
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

prog
	.command('set awsprofile [name]')
	.describe(`Set an AWS credentials profile name. If 'name' is not set, it will remove the configured profile name.`)
	.action(name => {
		if (name) {
			config.set('awsprofile', name)
			exit(0, `AWS profile set: ${name}`)
		} else {
			config.unset('awsprofile')
			exit(0, `Removed AWS profile.`)
		}
	})

prog
	.command('set command <name> [script]')
	.describe(`Set an executable command. If not set, it will remove the registered command. Allowed characters are ${COMMAND_REGEX.toString()} start and end characters may not be dashes or underscores. When a request is received to execute this command, this service will execute <script> with an optional path to a temporary file containing any properties passed in with the execution request.`)
	.action((name, script) => {
		assertCommandNameIsSafe(name)
		if (script) {
			config.set(`commands.${name}`, script)
			exit(0, `Added command: ${name} => ${script}`)
		} else {
			config.unset(`commands.${name}`)
			exit(0, `Removed command: ${name}`)
		}
	})

prog
	.command('set sqs <url>')
	.describe(`Set the SQS queue URL. Queue URLs are case-sensitive.`)
	.action(url => {
		config.set('sqsUrl', url)
		exit(0, `Set SQS queue URL: "${url}"`)
	})

prog
	.command('set temp [folder]')
	.describe(`Set the folder to store payloads. Leave blank to revert to default: ${TEMP_FOLDER}`)
	.action(folder => {
		if (folder) {
			config.set('tempFolder', folder)
			exit(0, `Payload temporary folder set: ${folder}`)
		} else {
			config.unset('tempFolder')
			exit(0, `Payload temporary folder reverted to default: ${TEMP_FOLDER}`)
		}
	})

prog
	.command('get awsprofile')
	.describe('Get the SQS queue URL.')
	.action(() => {
		exit(0, config.get('awsprofile'))
	})

prog
	.command('get command [name]')
	.describe('List executable commands. If [name] is set, it will print only that command.')
	.action(name => {
		if (name) {
			assertCommandNameIsSafe(name)
			console.log(config.get(`commands.${name}`))
		} else {
			const commands = config.get('commands') || {}
			Object
				.keys(commands)
				.forEach(key => {
					console.log(`${key} => ${commands[key]}`)
				})
		}
	})

prog
	.command('get sqs')
	.describe('Get the SQS queue URL.')
	.action(() => {
		exit(0, config.get('sqsUrl'))
	})

prog
	.command('get temp')
	.describe('Get the folder used to store payloads.')
	.action(() => {
		exit(0, config.get('tempFolder'))
	})

prog.parse(process.argv)
