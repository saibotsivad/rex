# 🦖 REX (`R`emote `EX`ecute)

Remotely execute commands via secure message passing.

## Intro

Imagine you have a spare computer at home, and you want to be able
to run commands on it, such as "build and re-publish my blog".

But now imagine that you're away at a coffee shop and want to run
the command. Normally you'd need to have a VPN into your home network,
or you'd need to be running TeamViewer, or something like that.

No need! If you have this installed, you can securely and confidently
pass commands to your computer using the magic of AWS SQS.

## How it Works

On your spare computer, you would install this CLI tool, configure
it (instructions below), and then leave it running.

The process watches an SQS queue and, on receiving a message, will run
a pre-configured command.

For example, if you have the script `/var/opt/rebuild-blog.sh` you might
register it with:

```bash
rex set command rebuild-blog /var/opt/rebuild-blog.sh
```

On your coffee shop laptop, you'd then run the command:

```bash
rex push rebuild-blog
```

This posts a message to SQS, which your spare computer will then receive,
and then execute the `/var/opt/rebuild-blog.sh` script.

## Data Payloads

You can pass a payload of up to ~256 KB, as data on the SQS message.

Do this by specifying a filepath when pushing commands:

```bash
rex push rebuild-blog /path/to/file.txt
```

When your script is run on the listening computer, if a payload is passed
along over SQS it will be written to a temporary file and the path to that
file will be the first parameter given to the command.

For example, the script on the listening computer might look like:

```bash
#!/usr/bin/env bash
# /var/opt/rebuild-blog.sh

PATH_TO_FILE=$1
blogbuilder --config=$PATH_TO_FILE
```

## Error Handling

This script doesn't handle errors or retries if your script fails, and
doesn't log anything anywhere, it just runs the script.

What you'll probably want to do, inside the script, is handle output
and errors.

Write stdout and stderr to the same file:

```bash
your-command >> logfile.txt 2>&1
```

Or stdout and stderr to different files:

```bash
your-command >> success.txt 2>> errors.txt
```

## Listen Forever

To have this process run forever, try a tool
[like this one](https://github.com/foreversd/forever), e.g.:

```bash
forever start rex listen
```

## Setup

You'll need [NodeJS](https://nodejs.org/) installed, then you can
install `rex` globally with:

```bash
npm install -g rex
```

### Create SQS Queue

Inside the AWS console, go to the SQS panel and create a new queue.

- Queue Name: pick something that ends with `.fifo`, e.g. `remote-execute.fifo`
- Queue Type: select FIFO
- Click the "Quick-Create Queue"

### Listening User

On the listening computer, you'll need IAM credentials to read off
the SQS queue.

- Create an IAM user, set a useful name like `rex-spare-desktop`
- Enable programmatic access
- Don't attach any policies to it
- At the end, save the key ID and secret for later use

From the user edit page, add an inline policy (the small blue "+" button)
that looks like this:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "sqs:GetQueueUrl",
                "sqs:DeleteMessage",
                "sqs:ReceiveMessage",
                "sqs:GetQueueAttributes"
            ],
            "Resource": "arn:aws:sqs:$REGION:$ACCOUNT_ID:$QUEUE_NAME"
        }
    ]
}
```

- `$REGION` is the AWS region that you created the SQS queue.
- `$ACCOUNT_ID` is the AWS account identifier, [available here](https://console.aws.amazon.com/billing/home?#/account)
- `$QUEUE_NAME` is the SQS queue, e.g. `remote-execute.fifo`

### Publishing User

On the publishing computer you'll need IAM credentials to
allow sending messages to the SQS queue.

- Create an IAM user, set a useful name like `rex-publisher`
- Enable programmatic access
- Don't attach any policies to it
- At the end, save the key ID and secret for later use

From the user edit page, add an inline policy (the small blue "+" button)
that looks like this:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "sqs:SendMessage"
            ],
            "Resource": "arn:aws:sqs:$REGION:$ACCOUNT_ID:$QUEUE_NAME"
        }
    ]
}
```

- `$REGION` is the AWS region that you created the SQS queue.
- `$ACCOUNT_ID` is the AWS account identifier, [available here](https://console.aws.amazon.com/billing/home?#/account)
- `$QUEUE_NAME` is the SQS queue, e.g. `remote-execute.fifo`

### Loading Credentials

There are three options for loading the credentials you just made.

1. Set the environment variables in the
   [secrets.example.sh](https://github.com/saibotsivad/remote-execute/blob/master/secrets.example.sh)
   before running `rex`, or
2. Load the credentials using the
   [AWS environment variables](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-environment.html)
   (be sure to also set `AWS_REGION`), or
3. Set a profile with `rex set awsprofile` to load credentials using the
   [AWS "Shared Credentials" file](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html)
   (the `awsprofile` property must be set to use this option).

Remember that if you set up `rex` to run using `forever` (earlier in this
document) that you will need to make sure credentials are configured for
whatever launches it.

## License

The code for this project is published and released under the
[Very Open License](http://veryopenlicense.com).
