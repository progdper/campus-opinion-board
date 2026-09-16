import { env } from "cloudflare:workers";

import type { Opinion } from "@/lib/types";
import {
  createPasswordCredential,
  verifyPassword,
  type PasswordCredential,
} from "@/lib/password";
import type {
  CreateOpinionInput,
  UpdateOpinionInput,
} from "@/lib/validation";

type OpinionRow = {
  id: number;
  nickname: string;
  content: string;
  created_at: string;
  updated_at: string | null;
  password_hash: string | null;
};

type OpinionCredentialRow = {
  password_hash: string | null;
  password_salt: string | null;
  password_iterations: number | null;
};

type MutationErrorResult =
  | { status: "not_found" }
  | { status: "legacy" }
  | { status: "invalid_password" };

type UpdateOpinionResult =
  | { status: "updated"; opinion: Opinion }
  | MutationErrorResult;

type DeleteOpinionResult = { status: "deleted" } | MutationErrorResult;

function toOpinion(row: OpinionRow): Opinion {
  return {
    id: row.id,
    nickname: row.nickname,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    canEdit: row.password_hash !== null,
  };
}

const PUBLIC_COLUMNS = `id, nickname, content, created_at, updated_at,
  password_hash`;

export async function listOpinions(): Promise<Opinion[]> {
  const result = await env.DB.prepare(
    `SELECT ${PUBLIC_COLUMNS}
     FROM opinions
     WHERE status = ?
     ORDER BY created_at DESC, id DESC
     LIMIT 30`,
  )
    .bind("visible")
    .all<OpinionRow>();

  return (result.results ?? []).map(toOpinion);
}

export async function createOpinion(
  input: CreateOpinionInput,
): Promise<Opinion> {
  const credential = await createPasswordCredential(input.password);
  const insert = await env.DB.prepare(
    `INSERT INTO opinions (
       nickname, content, password_hash, password_salt, password_iterations
     ) VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(
      input.nickname,
      input.content,
      credential.hash,
      credential.salt,
      credential.iterations,
    )
    .run();

  const insertedId = Number(insert.meta.last_row_id);
  const row = await env.DB.prepare(
    `SELECT ${PUBLIC_COLUMNS}
     FROM opinions
     WHERE id = ?`,
  )
    .bind(insertedId)
    .first<OpinionRow>();

  if (!row) {
    throw new Error("The inserted opinion could not be read.");
  }

  return toOpinion(row);
}

async function getCredential(id: number): Promise<OpinionCredentialRow | null> {
  return env.DB.prepare(
    `SELECT password_hash, password_salt, password_iterations
     FROM opinions
     WHERE id = ? AND status = ?`,
  )
    .bind(id, "visible")
    .first<OpinionCredentialRow>();
}

function toCredential(row: OpinionCredentialRow): PasswordCredential | null {
  if (
    row.password_hash === null ||
    row.password_salt === null ||
    row.password_iterations === null
  ) {
    return null;
  }

  return {
    hash: row.password_hash,
    salt: row.password_salt,
    iterations: row.password_iterations,
  };
}

export async function updateOpinion(
  id: number,
  input: UpdateOpinionInput,
): Promise<UpdateOpinionResult> {
  const row = await getCredential(id);
  if (!row) {
    return { status: "not_found" };
  }

  const credential = toCredential(row);
  if (!credential) {
    return { status: "legacy" };
  }

  if (!(await verifyPassword(input.password, credential))) {
    return { status: "invalid_password" };
  }

  await env.DB.prepare(
    `UPDATE opinions
     SET nickname = ?, content = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND status = ?`,
  )
    .bind(input.nickname, input.content, id, "visible")
    .run();

  const updated = await env.DB.prepare(
    `SELECT ${PUBLIC_COLUMNS}
     FROM opinions
     WHERE id = ? AND status = ?`,
  )
    .bind(id, "visible")
    .first<OpinionRow>();

  return updated
    ? { status: "updated", opinion: toOpinion(updated) }
    : { status: "not_found" };
}

export async function deleteOpinion(
  id: number,
  password: string,
): Promise<DeleteOpinionResult> {
  const row = await getCredential(id);
  if (!row) {
    return { status: "not_found" };
  }

  const credential = toCredential(row);
  if (!credential) {
    return { status: "legacy" };
  }

  if (!(await verifyPassword(password, credential))) {
    return { status: "invalid_password" };
  }

  await env.DB.prepare(`DELETE FROM opinions WHERE id = ? AND status = ?`)
    .bind(id, "visible")
    .run();

  return { status: "deleted" };
}
