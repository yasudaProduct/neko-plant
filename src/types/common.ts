export type ActionResult<T = undefined> = {
    success: true;
    title?: string;
    message?: string;
    data?: T;
} | {
    success: false;
    code: ActionErrorCode;
    title?: string;
    message?: string;
    data?: T;
};

export enum ActionErrorCode {
    AUTH_REQUIRED = "AUTH_REQUIRED",
}

export type ActionParams<T> = {
    params: T;
};