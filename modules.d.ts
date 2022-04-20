declare namespace NodeJS {
    export interface ProcessEnv {
        HOST: string;
        NG_APP_URL: string;
        MONGODB_URL: string;
        JWT_SECRET: string;
        DB_NAME?: string;
    }
}