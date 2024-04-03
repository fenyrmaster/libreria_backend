const createCategoriasModel = `
    CREATE TABLE IF NOT EXISTS Etiquetas(
        nombre text NOT NULL UNIQUE,
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY NOT NULL,
        id_administrador UUID,
        tipo tipo NOT NULL,
        FOREIGN KEY (id_administrador) REFERENCES Usuarios(id)
    )
`;

const tempTableEtiquetas = `
    CREATE TABLE IF NOT EXISTS tempEtiquetas(
        id UUID,
        nombre text
    )
`;

const categoriaType = `
DO $$ 
BEGIN
    BEGIN
        CREATE TYPE tipo AS ENUM ('Genero', 'Categoria');
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;
`;

const auditoriaEtiquetas = `
    CREATE TABLE IF NOT EXISTS AuditoriaEtiquetas(
        id_administrador UUID,
        accion actionType NOT NULL,
        nombre_etiqueta text,
        fecha TIMESTAMP DEFAULT NOW() NOT NULL,
        FOREIGN KEY (id_administrador) REFERENCES Usuarios(id)
    )
`;

const accionType = `
DO $$ 
BEGIN
    BEGIN
        CREATE TYPE actionType AS ENUM ('Update', 'Delete', 'Insert');
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;
`;

const triggerUpdateInsert = `
    CREATE OR REPLACE FUNCTION updateInsertEtiquetas()
    RETURNS TRIGGER AS $$
    BEGIN
        IF TG_OP = 'INSERT' THEN
            INSERT INTO AuditoriaEtiquetas(id_administrador, accion, nombre_etiqueta) VALUES(NEW.id_administrador, 'Insert', NEW.nombre);
            RAISE NOTICE 'Operación insertar realizada en etiquetas';
            RETURN NEW;
        ELSIF TG_OP = 'UPDATE' THEN
            INSERT INTO AuditoriaEtiquetas(id_administrador, accion, nombre_etiqueta) VALUES(NEW.id_administrador, 'Update', NEW.nombre);
            RAISE NOTICE 'Operación actualizar realizada en etiquetas';
            RETURN NEW;
        END IF;
    END;
    $$ LANGUAGE plpgsql;
`;

const triggerDelete = `
    CREATE OR REPLACE FUNCTION deleteEtiquetas()
    RETURNS TRIGGER AS $$
    DECLARE
        nombre_etiqueta_select text;
        id_etiqueta UUID;
    BEGIN
        SELECT nombre, id INTO nombre_etiqueta_select, id_etiqueta FROM tempEtiquetas;
        INSERT INTO AuditoriaEtiquetas(id_administrador, accion, nombre_etiqueta) VALUES(id_etiqueta, 'Delete', nombre_etiqueta_select);
        RAISE NOTICE 'Operación borrar realizada en etiquetas';
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
`;

const triggerUpdateInsertOptions = `
    CREATE OR REPLACE TRIGGER triggerUpdateInsert
    AFTER INSERT OR UPDATE
    ON Etiquetas
    FOR EACH ROW
    EXECUTE FUNCTION updateInsertEtiquetas();
`;

const triggerDeleteOptions = `
    CREATE OR REPLACE TRIGGER triggerDelete
    BEFORE DELETE
    ON Etiquetas
    FOR EACH STATEMENT
    EXECUTE FUNCTION deleteEtiquetas();
`;

module.exports = {
    createCategoriasModel,
    categoriaType,
    auditoriaEtiquetas,
    accionType,
    triggerUpdateInsert,
    triggerUpdateInsertOptions,
    tempTableEtiquetas,
    triggerDelete,
    triggerDeleteOptions
}