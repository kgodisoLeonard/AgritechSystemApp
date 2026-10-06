-- Existing numeric IDs keep their values; new farmers can use UUID strings.
DO $$
DECLARE
    farmer_id_type oid;
    foreign_keys jsonb;
    foreign_key jsonb;
    routines jsonb;
    routine jsonb;
    call_arguments text;
    wrapper_body text;
BEGIN
    SELECT atttypid INTO farmer_id_type FROM pg_attribute
    WHERE attrelid = 'farmers'::regclass AND attname = 'id' AND NOT attisdropped;
    IF farmer_id_type NOT IN ('smallint'::regtype, 'integer'::regtype, 'bigint'::regtype) THEN
        RETURN;
    END IF;

    PERFORM set_config('lock_timeout', '5s', true);
    LOCK TABLE farmers IN ACCESS EXCLUSIVE MODE;
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE contype = 'f' AND confrelid = 'farmers'::regclass
          AND (array_length(conkey, 1) <> 1 OR array_length(confkey, 1) <> 1)
    ) THEN
        RAISE EXCEPTION 'Composite farmer foreign keys require a separate migration';
    END IF;

    SELECT coalesce(jsonb_agg(jsonb_build_object(
        'table', conrelid::regclass::text, 'name', conname,
        'column', attribute.attname, 'definition', pg_get_constraintdef(constraint_row.oid)
    ) ORDER BY conrelid, conname), '[]'::jsonb) INTO foreign_keys
    FROM pg_constraint AS constraint_row
    JOIN pg_attribute AS attribute ON attribute.attrelid = conrelid AND attribute.attnum = conkey[1]
    WHERE contype = 'f' AND confrelid = 'farmers'::regclass;

    SELECT coalesce(jsonb_agg(jsonb_build_object(
        'name', format('%I.%I', namespace.nspname, procedure.proname),
        'kind', procedure.prokind,
        'definition', pg_get_functiondef(procedure.oid),
        'arguments', pg_get_function_identity_arguments(procedure.oid),
        'returns', pg_get_function_result(procedure.oid),
        'names', to_jsonb(procedure.proargnames),
        'void', procedure.prorettype = 'void'::regtype
    )), '[]'::jsonb) INTO routines
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.oid = (SELECT relnamespace FROM pg_class WHERE oid = 'farmers'::regclass)
      AND procedure.prokind IN ('f', 'p')
      AND procedure.proargtypes[array_position(procedure.proargnames, 'p_farmer_id') - 1]
          IN ('smallint'::regtype, 'integer'::regtype, 'bigint'::regtype);

    FOR foreign_key IN SELECT value FROM jsonb_array_elements(foreign_keys) LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', foreign_key->>'table', foreign_key->>'name');
    END LOOP;
    ALTER TABLE farmers ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE farmers ALTER COLUMN id TYPE VARCHAR(36) USING id::VARCHAR(36);
    ALTER TABLE farmers ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
    FOR foreign_key IN SELECT value FROM jsonb_array_elements(foreign_keys) LOOP
        EXECUTE format('ALTER TABLE %s ALTER COLUMN %I TYPE VARCHAR(36) USING %I::VARCHAR(36)',
            foreign_key->>'table', foreign_key->>'column', foreign_key->>'column');
        EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s',
            foreign_key->>'table', foreign_key->>'name', foreign_key->>'definition');
    END LOOP;

    FOR routine IN SELECT value FROM jsonb_array_elements(routines) LOOP
        -- PostgreSQL renders the declaration; only the farmer parameter changes.
        EXECUTE regexp_replace(routine->>'definition',
            'p_farmer_id (smallint|integer|bigint)', 'p_farmer_id character varying');
        SELECT string_agg(format('%I%s', name,
            CASE WHEN name = 'p_farmer_id' THEN '::VARCHAR' ELSE '' END), ', ' ORDER BY position)
        INTO call_arguments
        FROM jsonb_array_elements_text(routine->'names') WITH ORDINALITY AS names(name, position);
        wrapper_body := format('BEGIN %s %s(%s); END;',
            CASE WHEN routine->>'kind' = 'p' THEN 'CALL'
                 WHEN (routine->>'void')::boolean THEN 'PERFORM' ELSE 'RETURN' END,
            routine->>'name', call_arguments);
        EXECUTE format('CREATE OR REPLACE %s %s(%s) %s LANGUAGE plpgsql AS %L',
            CASE WHEN routine->>'kind' = 'p' THEN 'PROCEDURE' ELSE 'FUNCTION' END,
            routine->>'name', routine->>'arguments',
            CASE WHEN routine->>'kind' = 'p' THEN '' ELSE 'RETURNS ' || (routine->>'returns') END,
            wrapper_body);
    END LOOP;
END $$;
