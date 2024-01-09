const { TranscribeClient } = require("@aws-sdk/client-transcribe");
// Set the AWS Region.
const AWS_REGION = "us-east-2"; //e.g. "us-east-1"
const AWS_ACCESS_KEY="AKIAXHJ6XYUP43LGMXPZ"
const AWS_SECRET_KEY="q9VoEnf/SVyuLpAhM9QdF5ZFMPtUFdeiQYY+48ei"
// Create an Amazon Transcribe service client object.
const transcribeClient = new TranscribeClient({ region: AWS_REGION, AWS_ACCESS_KEY, AWS_SECRET_KEY });
module.exports = { transcribeClient };