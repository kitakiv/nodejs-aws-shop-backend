import { SQSHandler, SQSEvent, Context } from "aws-lambda";

export const handler: SQSHandler = async (event: SQSEvent, context: Context) => {
    console.log('event', event)
  try {
    for (const record of event.Records) {
      const messageBody = JSON.parse(record.body);
      console.log('messageBody', messageBody)
    }
  } catch (error) {
    console.error('Error:', error);
  }
};