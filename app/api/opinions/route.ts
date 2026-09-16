import { env } from "cloudflare:workers";

import { createOpinion, listOpinions } from "@/lib/opinions";
import { REQUEST_MAX_LENGTH, validateCreateOpinion } from "@/lib/validation";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

function errorResponse(code: string, message: string, status: number) {
  return Response.json(
    { error: { code, message } },
    { status, headers: NO_STORE_HEADERS },
  );
}

export async function GET() {
  try {
    const opinions = await listOpinions();
    return Response.json({ data: opinions }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Failed to list opinions", error);
    return errorResponse(
      "LIST_FAILED",
      "의견을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      500,
    );
  }
}

export async function POST(request: Request) {
  if (env.WRITE_ENABLED !== "true") {
    return errorResponse(
      "SUBMISSIONS_CLOSED",
      "현재는 의견 등록 시간이 아닙니다.",
      503,
    );
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return errorResponse(
      "UNSUPPORTED_CONTENT_TYPE",
      "JSON 형식으로 요청해 주세요.",
      415,
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > REQUEST_MAX_LENGTH) {
    return errorResponse("PAYLOAD_TOO_LARGE", "요청 내용이 너무 큽니다.", 413);
  }

  try {
    const rawBody = await request.text();
    if (rawBody.length > REQUEST_MAX_LENGTH) {
      return errorResponse("PAYLOAD_TOO_LARGE", "요청 내용이 너무 큽니다.", 413);
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return errorResponse("INVALID_JSON", "JSON 형식을 확인해 주세요.", 400);
    }

    const validation = validateCreateOpinion(body);
    if (!validation.ok) {
      return errorResponse(validation.code, validation.message, 400);
    }

    const clientKey =
      request.headers.get("CF-Connecting-IP") ?? "local-development";
    const rateLimit = await env.SUBMISSION_RATE_LIMITER.limit({
      key: `${clientKey}:create`,
    });

    if (!rateLimit.success) {
      return errorResponse(
        "RATE_LIMITED",
        "등록 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
        429,
      );
    }

    const opinion = await createOpinion(validation.data);
    return Response.json(
      { data: opinion },
      { status: 201, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error("Failed to create an opinion", error);
    return errorResponse(
      "CREATE_FAILED",
      "의견을 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      500,
    );
  }
}
