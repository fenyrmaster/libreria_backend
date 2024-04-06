const createPrestamoModel = `
    CREATE TABLE IF NOT EXISTS Prestamos(
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY NOT NULL,
        id_administrador UUID,
        fecha_entrega DATE NOT NULL,
        fecha_vencimiento DATE,
        id_usuario UUID NOT NULL,
        id_book UUID NOT NULL,
        estado ESTADOS NOT NULL DEFAULT 'Reservado'
    )
`;

const estadoType = `
DO $$ 
BEGIN
    BEGIN
        CREATE TYPE ESTADOS AS ENUM ('Devuelto', 'No Devuelto', 'Recogido', 'Reservado', 'Cancelado');
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;
`;

const tempTablePrestamos = `
    CREATE TABLE IF NOT EXISTS tempPrestamos(
        id UUID,
        nombre text,
        rol_usuario text
    )
`;

const auditoriaPrestamos = `
    CREATE TABLE IF NOT EXISTS AuditoriaPrestamos(
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY NOT NULL,
        id_administrador UUID,
        accion actionType NOT NULL,
        nombre_usuario_prestamo text,
        fecha TIMESTAMP DEFAULT NOW() NOT NULL,
        FOREIGN KEY (id_administrador) REFERENCES Usuarios(id)
    )
`;

const prestamoTriggerUpdateInsert = `
    CREATE OR REPLACE FUNCTION updateInsertPrestamos()
    RETURNS TRIGGER AS $$
    DECLARE
        rol_usuario_check text;
        nombre_usuario_check text;
    BEGIN
        SELECT rol_usuario, nombre INTO rol_usuario_check, nombre_usuario_check FROM tempPrestamos;
        IF TG_OP = 'INSERT' AND rol_usuario_check = 'Administrador' THEN
            INSERT INTO AuditoriaPrestamos(id_administrador, accion, nombre_usuario_prestamo) VALUES(NEW.id_administrador, 'Insert', nombre_usuario_check);
            RAISE NOTICE 'Operación insertar realizada en prestamos';
            RETURN NEW;
        ELSIF TG_OP = 'UPDATE' AND rol_usuario_check = 'Administrador' THEN
            INSERT INTO AuditoriaPrestamos(id_administrador, accion, nombre_usuario_prestamo) VALUES(NEW.id_administrador, 'Update', nombre_usuario_check);
            RAISE NOTICE 'Operación actualizar realizada en prestamos';
            RETURN NEW;
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
`;

const prestamoTriggerDelete = `
    CREATE OR REPLACE FUNCTION deletePrestamos()
    RETURNS TRIGGER AS $$
    DECLARE
        nombre_usuario_check text;
        id_admin_tr UUID;
    BEGIN
        SELECT u.nombre INTO nombre_usuario_check FROM Prestamos p JOIN Usuarios u ON p.id_usuario = u.id WHERE p.id = OLD.id;
        SELECT id INTO id_admin_tr FROM tempPrestamos;
        INSERT INTO AuditoriaPrestamos(id_administrador, accion, nombre_usuario_prestamo) VALUES(id_admin_tr, 'Delete', nombre_usuario_check);
        RAISE NOTICE 'Operación borrar realizada en prestamos';
        RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;
`;

const prestamoTriggerUpdateInsertOptions = `
    CREATE OR REPLACE TRIGGER prestamoTriggerUpdateInsert
    AFTER INSERT OR UPDATE
    ON Prestamos
    FOR EACH ROW
    EXECUTE FUNCTION updateInsertPrestamos();
`;

const prestamoTriggerDeleteOptions = `
    CREATE OR REPLACE TRIGGER prestamoTriggerDelete
    BEFORE DELETE
    ON Prestamos
    FOR EACH ROW
    EXECUTE FUNCTION deletePrestamos();
`;

module.exports = {
    estadoType,
    createPrestamoModel,
    tempTablePrestamos,
    auditoriaPrestamos,
    prestamoTriggerUpdateInsert,
    prestamoTriggerDelete,
    prestamoTriggerUpdateInsertOptions,
    prestamoTriggerDeleteOptions
}