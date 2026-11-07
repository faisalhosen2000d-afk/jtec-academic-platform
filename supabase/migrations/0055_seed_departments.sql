BEGIN;

INSERT INTO public.departments (name, code)
VALUES
    ('Yarn Engineering', 'YARN'),
    ('Fabric Engineering', 'FABRIC'),
    ('Wet Process Engineering', 'WET_PROCESS'),
    ('Apparel Engineering', 'APPAREL')
ON CONFLICT (name) DO NOTHING;

COMMIT;
