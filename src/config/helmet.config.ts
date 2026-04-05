import { HelmetOptions } from 'helmet';

export const getHelmetConfig = (): HelmetOptions => {
    return {
        crossOriginResourcePolicy: { policy: "cross-origin" },
        crossOriginEmbedderPolicy: { policy: "require-corp" },
        crossOriginOpenerPolicy: { policy: "same-origin" },
        contentSecurityPolicy: { 
            directives: { 
                defaultSrc: ["'self'"], 
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], 
                styleSrc: ["'self'", "'unsafe-inline'"], 
                imgSrc: ["'self'", "data:", "https:"] 
            } 
        },
        dnsPrefetchControl: { allow: false },
        frameguard: { action: "deny" },
        hidePoweredBy: true,
        hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
        ieNoOpen: true,
        noSniff: true,
        referrerPolicy: { policy: "strict-origin-when-cross-origin" },
        xssFilter: true,
    }
}