import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult, Context, Callback } from 'aws-lambda';
import generatePolicy from './policy/generetePolicy';
import { config } from 'dotenv';
config();

export const handler = async (event: APIGatewayTokenAuthorizerEvent, _context: Context): Promise<APIGatewayAuthorizerResult> => {
  console.log('Event: ', JSON.stringify(event));

  try {
    const authorizationHeader = event.authorizationToken;
    if (!authorizationHeader || !authorizationHeader.toLowerCase().startsWith('basic ')) {
      throw new Error('Unauthorized: Missing or invalid Authorization header');
    }
    const base64Credentials = authorizationHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    if (!username || !password) {
      throw new Error('Invalid credentials format');
    }

    console.log( process.env[username], process.env.kitakiv);
    const storedPassword = process.env[username];
    const effect = (storedPassword && storedPassword === password) ? 'Allow' : 'Deny';
    return generatePolicy(base64Credentials, effect, event.methodArn);
  } catch (error) {
    console.error('Error:', error);
    throw new Error( `Unauthorized: ${(error as Error).message}`);
  }
};
