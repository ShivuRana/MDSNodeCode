import { StartTranscriptionJobCommand } from "@aws-sdk/client-transcribe";
import { transcribeClient } from "transcribeclient.js";

// Set the parameters
export const params = {
  TranscriptionJobName: "speechrecognize",
  LanguageCode: "en-US", // For example, 'en-US'
  MediaFormat: "flac", // For example, 'wav'
  Media: {
    MediaFileUri: "SOURCE_LOCATION",
    // For example, "https://transcribe-demo.s3-REGION.amazonaws.com/hello_world.wav"
  },
  OutputBucketName: process.env.AWS_BUCKET
};

export const run = async () => {
  try {
    const data = await transcribeClient.send(
      new StartTranscriptionJobCommand(params)
    );
    console.log("Success - put", data);
    return data; // For unit tests.
  } catch (err) {
    console.log("Error", err);
  }
};
run();
// snippet-end:[transcribe.JavaScript.jobs.createJobV3]
// For unit tests.
// module.exports = {run, params}