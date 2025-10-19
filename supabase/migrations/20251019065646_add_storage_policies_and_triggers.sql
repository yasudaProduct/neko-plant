CREATE TRIGGER new_user_for_auth_trigger AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION create_user_for_auth();

CREATE TRIGGER update_user_for_auth_trigger AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION update_user_for_auth();


