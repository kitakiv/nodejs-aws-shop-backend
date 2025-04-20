import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as YAML from 'yamljs';
import { join } from 'path';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const swaggerDocument = YAML.load(join(__dirname, './docs/swagger.yaml'));

        if (event.path.endsWith('/swagger.json')) {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS'
                },
                body: JSON.stringify(swaggerDocument)
            };
        }

        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Product Service API Documentation</title>
                <link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css" />
                <link rel="icon" type="image/png" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/favicon-32x32.png" sizes="32x32" />
                <link rel="icon" type="image/png" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/favicon-16x16.png" sizes="16x16" />
                <style>
                    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
                    *, *:before, *:after { box-sizing: inherit; }
                    body { margin: 0; background: #fafafa; }
                </style>
            </head>
            <body>
                <div id="swagger-ui"></div>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js"></script>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js"></script>
                <script>
                    window.onload = function() {
                        const ui = SwaggerUIBundle({
                            spec: ${JSON.stringify(swaggerDocument)},
                            dom_id: '#swagger-ui',
                            deepLinking: true,
                            presets: [
                                SwaggerUIBundle.presets.apis,
                                SwaggerUIStandalonePreset
                            ],
                            plugins: [
                                SwaggerUIBundle.plugins.DownloadUrl
                            ],
                            layout: "StandaloneLayout"
                        });
                        window.ui = ui;
                    };
                </script>
            </body>
            </html>
        `;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/html',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            body: html
        };
    } catch (error) {
        console.error('Error serving Swagger documentation:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: 'Error loading API documentation',
                error: process.env.NODE_ENV === 'development' ? error : undefined
            })
        };
    }
};
