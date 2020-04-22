# remote-execute

Remotely execute services via message passing.

To have this process run forever, try a tool [like this one](https://github.com/foreversd/forever), e.g.:

```
forever start remote-execute listen
```

You'll need to have AWS credentials configured

## IAM permissions

writing

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "sqs:SendMessage"
            ],
            "Resource": "arn:aws:sqs:*:*:demo-remote-execute.fifo"
        }
    ]
}
```

reading

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "sqs:GetQueueUrl",
                "sqs:ReceiveMessage",
                "sqs:GetQueueAttributes"
            ],
            "Resource": "arn:aws:sqs:*:*:demo-remote-execute.fifo"
        }
    ]
}
```
