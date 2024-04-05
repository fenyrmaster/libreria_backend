const createBooksModel = `
    CREATE TABLE IF NOT EXISTS Books(
        titulo text NOT NULL,
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY NOT NULL,
        id_administrador UUID,
        editorial text NOT NULL,
        sinopsis text NOT NULL,
        stock INTEGER NOT NULL,
        edicion text NOT NULL,
        autores text NOT NULL,
        fecha_publicacion DATE NOT NULL DEFAULT CURRENT_DATE,
        paginas INTEGER NOT NULL,
        image text NOT NULL
    )
`;

const booksTagsModel = `
    CREATE TABLE IF NOT EXISTS BooksTags(
        id_book UUID NOT NULL,
        id_tag UUID NOT NULL,
        FOREIGN KEY (id_book) REFERENCES Books(id),
        FOREIGN KEY (id_tag) REFERENCES Etiquetas(id)
    )
`;

const tempTableBooks = `
    CREATE TABLE IF NOT EXISTS tempBooks(
        id UUID,
        nombre text
    )
`;

const auditoriaLibros = `
    CREATE TABLE IF NOT EXISTS AuditoriaLibros(
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY NOT NULL,
        id_administrador UUID,
        accion actionType NOT NULL,
        nombre_libro text,
        fecha TIMESTAMP DEFAULT NOW() NOT NULL,
        FOREIGN KEY (id_administrador) REFERENCES Usuarios(id)
    )
`;

const bookTriggerUpdateInsert = `
    CREATE OR REPLACE FUNCTION updateInsertBooks()
    RETURNS TRIGGER AS $$
    BEGIN
        IF TG_OP = 'INSERT' THEN
            INSERT INTO AuditoriaLibros(id_administrador, accion, nombre_libro) VALUES(NEW.id_administrador, 'Insert', NEW.titulo);
            RAISE NOTICE 'Operación insertar realizada en libros';
            RETURN NEW;
        ELSIF TG_OP = 'UPDATE' THEN
            INSERT INTO AuditoriaLibros(id_administrador, accion, nombre_libro) VALUES(NEW.id_administrador, 'Update', NEW.titulo);
            RAISE NOTICE 'Operación actualizar realizada en libros';
            RETURN NEW;
        END IF;
    END;
    $$ LANGUAGE plpgsql;
`;

const bookTriggerDelete = `
    CREATE OR REPLACE FUNCTION deleteBooks()
    RETURNS TRIGGER AS $$
    DECLARE
        nombre_book_select text;
        id_book_tr UUID;
    BEGIN
        SELECT nombre, id INTO nombre_book_select, id_book_tr FROM tempBooks;
        INSERT INTO AuditoriaLibros(id_administrador, accion, nombre_libro) VALUES(id_book_tr, 'Delete', nombre_book_select);
        DELETE FROM BooksTags WHERE id_book = OLD.id;
        RAISE NOTICE 'Operación borrar realizada en libros';
        RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;
`;

const bookTriggerUpdateInsertOptions = `
    CREATE OR REPLACE TRIGGER bookTriggerUpdateInsert
    AFTER INSERT OR UPDATE
    ON Books
    FOR EACH ROW
    EXECUTE FUNCTION updateInsertBooks();
`;

const bookTriggerDeleteOptions = `
    CREATE OR REPLACE TRIGGER bookTriggerDelete
    BEFORE DELETE
    ON Books
    FOR EACH ROW
    EXECUTE FUNCTION deleteBooks();
`;

module.exports = {
    createBooksModel,
    tempTableBooks,
    auditoriaLibros,
    booksTagsModel,
    bookTriggerDelete,
    bookTriggerUpdateInsert,
    bookTriggerDeleteOptions,
    bookTriggerUpdateInsertOptions
}