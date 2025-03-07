import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const createPresignedUrlWithClient = ({ region, bucket, fileName }: { region: string; bucket: string; fileName: string }) => {
    const client = new S3Client({ region });
    const command = new PutObjectCommand({
        Bucket: bucket, Key: `uploaded/${fileName}`,
        ContentType: 'text/csv',
    });
    return getSignedUrl(client, command, { expiresIn: 3600 });
};

export { createPresignedUrlWithClient };