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
    .addTag('identity')
    .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Ingresa el access_token de Keycloak (sin el prefijo Bearer)',
        in: 'header',        
    });  // nombre 'bearer' coincide con @ApiBearerAuth() sin argumento

    return builder.build();
}