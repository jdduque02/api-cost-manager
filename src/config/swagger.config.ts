import { DocumentBuilder, OpenAPIObject } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";

type Environment = 'DEV' | 'PROD' | 'LOCAL';
export const getSwaggerConfig = (configService: ConfigService): Omit<OpenAPIObject, 'paths'> => {
    const environment = configService.get<Environment>('NODE_ENV') || 'LOCAL';
    const builder = new DocumentBuilder()
    .setTitle(`Cost Manager API - ${environment}`)
    .setDescription(`The API documentation for Cost Manager - ${environment}`)
    .setVersion(configService.get<string>('VERSION') || '1')    
    .addTag('costs')
    .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',        
    }, 'Access-Token');

    return builder.build();
}