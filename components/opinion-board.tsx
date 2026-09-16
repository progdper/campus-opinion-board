"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import type { ApiResponse, Opinion } from "@/lib/types";
import {
  CONTENT_MAX_LENGTH,
  NICKNAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/validation";

function getErrorMessage<T>(payload: ApiResponse<T>): string {
  return "error" in payload
    ? payload.error.message
    : "요청을 처리하지 못했습니다.";
}

function formatDate(value: string): string {
  const date = new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z"));
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(date);
}

export function OpinionBoard() {
  const [opinions, setOpinions] = useState<Opinion[]>([]);
  const [nickname, setNickname] = useState("");
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [activeAction, setActiveAction] = useState<{
    id: number;
    mode: "edit" | "delete";
  } | null>(null);
  const [editNickname, setEditNickname] = useState("");
  const [editContent, setEditContent] = useState("");
  const [mutationPassword, setMutationPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [listError, setListError] = useState("");
  const [listNotice, setListNotice] = useState("");

  const loadOpinions = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/opinions", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<Opinion[]>;

      if (!response.ok || "error" in payload) {
        throw new Error(getErrorMessage(payload));
      }

      setOpinions(payload.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "의견을 불러오지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOpinions();
  }, [loadOpinions]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const trimmedNickname = nickname.trim();
    const trimmedContent = content.trim();

    if (!trimmedNickname || !trimmedContent || !password) {
      setError("닉네임, 의견, 비밀번호를 모두 입력해 주세요.");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/opinions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: trimmedNickname,
          content: trimmedContent,
          password,
          passwordConfirmation,
        }),
      });
      const payload = (await response.json()) as ApiResponse<Opinion>;

      if (!response.ok || "error" in payload) {
        throw new Error(getErrorMessage(payload));
      }

      setOpinions((current) => [payload.data, ...current].slice(0, 30));
      setContent("");
      setPassword("");
      setPasswordConfirmation("");
      setNotice("의견이 등록되었습니다.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "의견을 등록하지 못했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeAction() {
    setActiveAction(null);
    setEditNickname("");
    setEditContent("");
    setMutationPassword("");
  }

  function openEdit(opinion: Opinion) {
    setActiveAction({ id: opinion.id, mode: "edit" });
    setEditNickname(opinion.nickname);
    setEditContent(opinion.content);
    setMutationPassword("");
    setListError("");
    setListNotice("");
  }

  function openDelete(opinion: Opinion) {
    setActiveAction({ id: opinion.id, mode: "delete" });
    setEditNickname("");
    setEditContent("");
    setMutationPassword("");
    setListError("");
    setListNotice("");
  }

  async function handleUpdate(
    event: FormEvent<HTMLFormElement>,
    opinionId: number,
  ) {
    event.preventDefault();
    setListError("");
    setListNotice("");
    setIsMutating(true);

    try {
      const response = await fetch(`/api/opinions/${opinionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: editNickname.trim(),
          content: editContent.trim(),
          password: mutationPassword,
        }),
      });
      const payload = (await response.json()) as ApiResponse<Opinion>;

      if (!response.ok || "error" in payload) {
        throw new Error(getErrorMessage(payload));
      }

      setOpinions((current) =>
        current.map((opinion) =>
          opinion.id === opinionId ? payload.data : opinion,
        ),
      );
      closeAction();
      setListNotice("의견이 수정되었습니다.");
    } catch (updateError) {
      setListError(
        updateError instanceof Error
          ? updateError.message
          : "의견을 수정하지 못했습니다.",
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDelete(
    event: FormEvent<HTMLFormElement>,
    opinionId: number,
  ) {
    event.preventDefault();
    setListError("");
    setListNotice("");
    setIsMutating(true);

    try {
      const response = await fetch(`/api/opinions/${opinionId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: mutationPassword }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as ApiResponse<never>;
        throw new Error(getErrorMessage(payload));
      }

      setOpinions((current) =>
        current.filter((opinion) => opinion.id !== opinionId),
      );
      closeAction();
      setListNotice("의견이 삭제되었습니다.");
    } catch (deleteError) {
      setListError(
        deleteError instanceof Error
          ? deleteError.message
          : "의견을 삭제하지 못했습니다.",
      );
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="intro-panel" aria-labelledby="page-title">
        <p className="eyebrow">CAMPUS OPINION BOARD</p>
        <h1 id="page-title">캠퍼스 한마디</h1>
        <p className="intro-copy">
          학교생활에서 바라는 점을 짧게 남겨주세요. 학번, 이메일 등 개인정보는
          입력하지 않습니다.
        </p>
        <div className="flow" aria-label="서비스 처리 순서">
          <span>브라우저</span>
          <b>→</b>
          <span>Next.js API</span>
          <b>→</b>
          <span>Cloudflare D1</span>
        </div>
      </section>

      <section className="card form-card" aria-labelledby="form-title">
        <div className="section-heading">
          <div>
            <p className="section-number">01</p>
            <h2 id="form-title">의견 등록</h2>
          </div>
          <span className="privacy-badge">개인정보 입력 금지</span>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="nickname">닉네임</label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            value={nickname}
            maxLength={NICKNAME_MAX_LENGTH}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="예: 민지"
            autoComplete="off"
            required
          />

          <div className="label-row">
            <label htmlFor="content">의견</label>
            <span>
              {content.length}/{CONTENT_MAX_LENGTH}
            </span>
          </div>
          <textarea
            id="content"
            name="content"
            value={content}
            maxLength={CONTENT_MAX_LENGTH}
            onChange={(event) => setContent(event.target.value)}
            placeholder="학교생활에서 개선되었으면 하는 점을 적어주세요."
            rows={5}
            required
          />

          <label htmlFor="password">수정·삭제 비밀번호</label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={`${PASSWORD_MIN_LENGTH}~${PASSWORD_MAX_LENGTH}자`}
            autoComplete="new-password"
            required
          />

          <label htmlFor="password-confirmation">비밀번호 확인</label>
          <input
            id="password-confirmation"
            name="passwordConfirmation"
            type="password"
            value={passwordConfirmation}
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            autoComplete="new-password"
            required
          />
          <p className="field-help">
            비밀번호는 수정·삭제할 때만 사용하며, 잊어버리면 복구할 수 없습니다.
          </p>

          <button className="submit-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "등록 중…" : "의견 등록하기"}
          </button>
        </form>

        <div className="message-area" aria-live="polite">
          {error ? <p className="message error-message">{error}</p> : null}
          {notice ? <p className="message success-message">{notice}</p> : null}
        </div>
      </section>

      <section className="card list-card" aria-labelledby="list-title">
        <div className="section-heading">
          <div>
            <p className="section-number">02</p>
            <h2 id="list-title">최근 의견</h2>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => void loadOpinions()}
            disabled={isLoading}
          >
            {isLoading ? "불러오는 중…" : "새로고침"}
          </button>
        </div>

        {isLoading ? <p className="empty-state">의견을 불러오고 있습니다.</p> : null}
        {!isLoading && opinions.length === 0 ? (
          <p className="empty-state">첫 번째 의견을 남겨주세요.</p>
        ) : null}

        <div className="message-area" aria-live="polite">
          {listError ? <p className="message error-message">{listError}</p> : null}
          {listNotice ? (
            <p className="message success-message">{listNotice}</p>
          ) : null}
        </div>

        <ul className="opinion-list">
          {opinions.map((opinion) => (
            <li key={opinion.id} className="opinion-item">
              <div className="opinion-meta">
                <strong>{opinion.nickname}</strong>
                <span className="opinion-time">
                  <time dateTime={opinion.createdAt}>
                    {formatDate(opinion.createdAt)}
                  </time>
                  {opinion.updatedAt ? " · 수정됨" : ""}
                </span>
              </div>
              <p>{opinion.content}</p>
              <div className="opinion-actions">
                {opinion.canEdit ? (
                  <>
                    <button type="button" onClick={() => openEdit(opinion)}>
                      수정
                    </button>
                    <button type="button" onClick={() => openDelete(opinion)}>
                      삭제
                    </button>
                  </>
                ) : (
                  <span>기존 데이터 · 읽기 전용</span>
                )}
              </div>

              {activeAction?.id === opinion.id &&
              activeAction.mode === "edit" ? (
                <form
                  className="mutation-form"
                  onSubmit={(event) => void handleUpdate(event, opinion.id)}
                >
                  <label htmlFor={`edit-nickname-${opinion.id}`}>닉네임</label>
                  <input
                    id={`edit-nickname-${opinion.id}`}
                    value={editNickname}
                    maxLength={NICKNAME_MAX_LENGTH}
                    onChange={(event) => setEditNickname(event.target.value)}
                    required
                  />
                  <label htmlFor={`edit-content-${opinion.id}`}>의견</label>
                  <textarea
                    id={`edit-content-${opinion.id}`}
                    value={editContent}
                    maxLength={CONTENT_MAX_LENGTH}
                    onChange={(event) => setEditContent(event.target.value)}
                    rows={4}
                    required
                  />
                  <label htmlFor={`edit-password-${opinion.id}`}>비밀번호</label>
                  <input
                    id={`edit-password-${opinion.id}`}
                    type="password"
                    value={mutationPassword}
                    minLength={PASSWORD_MIN_LENGTH}
                    maxLength={PASSWORD_MAX_LENGTH}
                    onChange={(event) => setMutationPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <div className="mutation-buttons">
                    <button type="button" onClick={closeAction}>취소</button>
                    <button className="confirm-button" type="submit" disabled={isMutating}>
                      {isMutating ? "수정 중…" : "수정 저장"}
                    </button>
                  </div>
                </form>
              ) : null}

              {activeAction?.id === opinion.id &&
              activeAction.mode === "delete" ? (
                <form
                  className="mutation-form delete-form"
                  onSubmit={(event) => void handleDelete(event, opinion.id)}
                >
                  <p>삭제하면 복구할 수 없습니다. 등록할 때 사용한 비밀번호를 입력하세요.</p>
                  <label htmlFor={`delete-password-${opinion.id}`}>비밀번호</label>
                  <input
                    id={`delete-password-${opinion.id}`}
                    type="password"
                    value={mutationPassword}
                    minLength={PASSWORD_MIN_LENGTH}
                    maxLength={PASSWORD_MAX_LENGTH}
                    onChange={(event) => setMutationPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <div className="mutation-buttons">
                    <button type="button" onClick={closeAction}>취소</button>
                    <button className="danger-button" type="submit" disabled={isMutating}>
                      {isMutating ? "삭제 중…" : "삭제 확인"}
                    </button>
                  </div>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
