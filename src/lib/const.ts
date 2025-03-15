const STORAGE_PATH_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/";

export const STORAGE_PATH = {
    USER_PROFILE: STORAGE_PATH_URL + "user_profiles/",
    USER_PET: STORAGE_PATH_URL + "user_pets/",
    PLANT: STORAGE_PATH_URL + "plants/",
};
