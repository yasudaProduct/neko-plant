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
    VALIDATION_ERROR = "VALIDATION_ERROR",
    ALREADY_EXISTS = "ALREADY_EXISTS",
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
    NOT_FOUND = "NOT_FOUND",
}

export type ActionParams<T> = {
    params: T;
};