const { CreateMultipartUploadCommand, UploadPartCommand} = require("@aws-sdk/client-s3")
const AWS = require("aws-sdk");

 const initParams = {
        Key: process.env.AWS_ID,
        Bucket: process.env.AWS_BUCKET
  }
  var s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
    Bucket: process.env.AWS_BUCKET,
});
 async function initiateMultipartUpload(){
    try{
        await s3.send(new CreateMultipartUploadCommand(initParams))
    }catch(err){
        // error handler function here
    }
}

async function UploadPart(body, UploadId, partNumber){
        const partParams = {
            Key: S3_KEY,
            Bucket: S3_BUCKET_NAME,
            Body: body,
            UploadId: UploadId,
            PartNumber: partNumber
        }
        return new Promise( async (resolve, reject) => {
            try {
                let part = await s3.send(new UploadPartCommand(partParams))
                resolve({ PartNumber: partNumber, ETag: part.ETag });
            } catch (error) {
                reject({partNumber, error});
            }
        })
    }   