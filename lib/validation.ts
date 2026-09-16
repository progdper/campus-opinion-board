export const NICKNAME_MAX_LENGTH = 20;
export const CONTENT_MAX_LENGTH = 300;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;
export const REQUEST_MAX_LENGTH = 4096;

export type CreateOpinionInput = {
  nickname: string;
  content: string;
  password: string;
};

export type UpdateOpinionInput = CreateOpinionInput;

export type DeleteOpinionInput = {
  password: string;
};

type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validatePassword(password: string): ValidationResult<string> {
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    return {
      ok: false,
      code: "INVALID_PASSWORD",
      message: `비밀번호는 ${PASSWORD_MIN_LENGTH}~${PASSWORD_MAX_LENGTH}자로 입력해 주세요.`,
    };
  }

  return { ok: true, data: password };
}

function validateOpinionFields(
  body: Record<string, unknown>,
): ValidationResult<UpdateOpinionInput> {
  const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (nickname.length < 1 || nickname.length > NICKNAME_MAX_LENGTH) {
    return {
      ok: false,
      code: "INVALID_NICKNAME",
      message: `닉네임은 1~${NICKNAME_MAX_LENGTH}자로 입력해 주세요.`,
    };
  }

  if (content.length < 1 || content.length > CONTENT_MAX_LENGTH) {
    return {
      ok: false,
      code: "INVALID_CONTENT",
      message: `의견은 1~${CONTENT_MAX_LENGTH}자로 입력해 주세요.`,
    };
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.ok) {
    return passwordValidation;
  }

  return {
    ok: true,
    data: { nickname, content, password: passwordValidation.data },
  };
}

export function validateCreateOpinion(
  body: unknown,
): ValidationResult<CreateOpinionInput> {
  if (!isRecord(body)) {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: "요청 내용을 확인해 주세요.",
    };
  }

  const validation = validateOpinionFields(body);
  if (!validation.ok) {
    return validation;
  }

  if (body.password !== body.passwordConfirmation) {
    return {
      ok: false,
      code: "PASSWORD_MISMATCH",
      message: "비밀번호 확인이 일치하지 않습니다.",
    };
  }

  return validation;
}

export function validateUpdateOpinion(
  body: unknown,
): ValidationResult<UpdateOpinionInput> {
  if (!isRecord(body)) {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: "요청 내용을 확인해 주세요.",
    };
  }

  return validateOpinionFields(body);
}

export function validateDeleteOpinion(
  body: unknown,
): ValidationResult<DeleteOpinionInput> {
  if (!isRecord(body)) {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: "요청 내용을 확인해 주세요.",
    };
  }

  const password = typeof body.password === "string" ? body.password : "";
  const validation = validatePassword(password);
  return validation.ok
    ? { ok: true, data: { password: validation.data } }
    : validation;
}
