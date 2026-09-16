import { env } from "cloudflare:workers";

import { deleteOpinion, updateOpinion } from "@/lib/opinions";
import {
  REQUEST_MAX_LENGTH,
  validateDeleteOpinion,
  validateUpdateOpinion,
} from "@/lib/validation";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function errorResponse(code: string, message: string, status: number) {
  return Response.json(
    { error: { code, message } },
    { status, headers: NO_STORE_HEADERS },
  );
}

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function readJsonBody(request: Request): Promise<
  | { ok: true; body: unknown }
  | { ok: false; response: Response }
> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return {
      ok: false,
      response: errorResponse(
        "UNSUPPORTED_CONTENT_TYPE",
        "JSON 형식으로 요청해 주세요.",
        415,
      ),
    };
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > REQUEST_MAX_LENGTH) {
    return {
      ok: false,
      response: errorResponse("PAYLOAD_TOO_LARGE", "요청 내용이 너무 큽니다.", 413),
    };
  }

  const rawBody = await request.text();
  if (rawBody.length > REQUEST_MAX_LENGTH) {
    return {
      ok: false,
      response: errorResponse("PAYLOAD_TOO_LARGE", "요청 내용이 너무 큽니다.", 413),
    };
  }

  try {
    return { ok: true, body: JSON.parse(rawBody) };
  } catch {
    return {
      ok: false,
      response: errorResponse("INVALID_JSON", "JSON 형식을 확인해 주세요.", 400),
    };
  }
}

async function checkMutationRequest(
  request: Request,
  idValue: string,
): Promise<{ ok: true; id: number; body: unknown } | { ok: false; response: Response }> {
  if (env.WRITE_ENABLED !== "true") {
    return {
      ok: false,
      response: errorResponse(
        "MUTATIONS_CLOSED",
        "현재는 의견을 수정하거나 삭제할 수 없습니다.",
        503,
      ),
    };
  }

  const id = parseId(idValue);
  if (id === null) {
    return {
      ok: false,
      response: errorResponse("INVALID_ID", "의견 번호를 확인해 주세요.", 400),
    };
  }

  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return parsed;
  }

  const clientKey =
    request.headers.get("CF-Connecting-IP") ?? "local-development";
  const rateLimit = await env.SUBMISSION_RATE_LIMITER.limit({
    key: `${clientKey}:mutation:${id}`,
  });
  if (!rateLimit.success) {
    return {
      ok: false,
      response: errorResponse(
        "RATE_LIMITED",
        "수정·삭제 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
        429,
      ),
    };
  }

  return { ok: true, id, body: parsed.body };
}

function mutationError(status: "not_found" | "legacy" | "invalid_password") {
  if (status === "not_found") {
    return errorResponse("NOT_FOUND", "의견을 찾을 수 없습니다.", 404);
  }
  if (status === "legacy") {
    return errorResponse(
      "LEGACY_READ_ONLY",
      "비밀번호 기능 추가 전에 등록된 의견은 수정하거나 삭제할 수 없습니다.",
      409,
    );
  }
  return errorResponse("INVALID_PASSWORD", "비밀번호가 일치하지 않습니다.", 403);
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: idValue } = await context.params;
    const checked = await checkMutationRequest(request, idValue);
    if (!checked.ok) {
      return checked.response;
    }

    const validation = validateUpdateOpinion(checked.body);
    if (!validation.ok) {
      return errorResponse(validation.code, validation.message, 400);
    }

    const result = await updateOpinion(checked.id, validation.data);
    return result.status === "updated"
      ? Response.json({ data: result.opinion }, { headers: NO_STORE_HEADERS })
      : mutationError(result.status);
  } catch (error) {
    console.error("Failed to update an opinion", error);
    return errorResponse(
      "UPDATE_FAILED",
      "의견을 수정하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      500,
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id: idValue } = await context.params;
    const checked = await checkMutationRequest(request, idValue);
    if (!checked.ok) {
      return checked.response;
    }

    const validation = validateDeleteOpinion(checked.body);
    if (!validation.ok) {
      return errorResponse(validation.code, validation.message, 400);
    }

    const result = await deleteOpinion(checked.id, validation.data.password);
    return result.status === "deleted"
      ? new Response(null, { status: 204, headers: NO_STORE_HEADERS })
      : mutationError(result.status);
  } catch (error) {
    console.error("Failed to delete an opinion", error);
    return errorResponse(
      "DELETE_FAILED",
      "의견을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      500,
    );
  }
}
