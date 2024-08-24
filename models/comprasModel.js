const createPagoModel = `
    CREATE TABLE IF NOT EXISTS Compras(
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY NOT NULL,
        id_administrador UUID,
        fecha_entrega DATE NOT NULL,
        precio REAL NOT NULL,
        pagado BOOLEAN NOT NULL,
        id_usuario UUID NOT NULL,
        id_book UUID NOT NULL,
        estado ESTADOSPAGOS NOT NULL DEFAULT 'Reservado',
        FOREIGN KEY (id_book) REFERENCES Books(id),
        FOREIGN KEY (id_usuario) REFERENCES Usuarios(id)
    )
`;

const estadoPagosType = `
DO $$ 
BEGIN
    BEGIN
        CREATE TYPE ESTADOSPAGOS AS ENUM ('Cancelado', 'Reservado', 'Pagado', 'Entregado');
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;
`;

module.exports = {
    estadoPagosType,
    createPagoModel
}