-- This is an empty migration.
CREATE OR REPLACE FUNCTION notify_outbox_change() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('outbox_changes', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- trigger que chama a função
CREATE TRIGGER outbox_change_trigger
AFTER INSERT ON "outbox"
FOR EACH ROW EXECUTE FUNCTION notify_outbox_change();