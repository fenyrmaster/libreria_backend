const createUserTable = `
    CREATE TABLE IF NOT EXISTS Usuarios(
        nombre text NOT NULL UNIQUE,
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY NOT NULL,
        localidad text NOT NULL,
        contrasena text NOT NULL,
        telefono text NOT NULL,
        correo_electronico text NOT NULL UNIQUE CHECK(correo_electronico LIKE '%@%.%'),
        domicilio text NOT NULL,
        rol roles NOT NULL,
        image text,
        confirmString text,
        confirmStringExpiration text,
        confirmado BOOLEAN NOT NULL DEFAULT FALSE,
        emailChangeString text DEFAULT NULL,
        passwordResetToken text DEFAULT NULL,
        passwordResetExpires text DEFAULT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE
    )
`;

const uuidextension = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
`;

const rolesType = `
DO $$ 
BEGIN
    BEGIN
        CREATE TYPE roles AS ENUM ('Administrador', 'Cliente');
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;
`;

module.exports ={
    createUserTable,
    rolesType,
    uuidextension
}