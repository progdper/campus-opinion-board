# Campus Opinion Board

비전공 대학생에게 다음 흐름을 설명하기 위한 강의용 MVP입니다.

```text
브라우저 → HTTP API → Next.js Route Handler → Cloudflare D1 → JSON 응답 → 화면 갱신
```

## 포함된 기능

- 최근 의견 30개 조회
- 닉네임·의견·수정/삭제 비밀번호 등록
- 등록 비밀번호를 이용한 의견 수정과 삭제
- 클라이언트·서버 입력 검증
- D1 Prepared Statement와 parameter binding
- 등록 요청 횟수 제한
- 수정·삭제 요청 횟수 제한
- 운영 중 등록을 닫을 수 있는 `WRITE_ENABLED` 설정
- 모바일 대응 화면과 사용자용 오류 메시지

## 요구사항

- Node.js 22.13 이상
- pnpm 또는 npm
- 원격 배포 시 GitHub 및 Cloudflare 계정

## 로컬 실행

```bash
pnpm install
pnpm db:migrate:local
pnpm dev
```

브라우저에서 터미널에 표시된 로컬 주소를 엽니다. 로컬 데이터는 `.wrangler/` 아래에 저장되며 Git에는 포함되지 않습니다.

## 주요 파일

| 파일 | 역할 |
|---|---|
| `app/page.tsx` | 한 페이지짜리 게시판 화면 진입점 |
| `components/opinion-board.tsx` | 사용자 입력, API 호출, 화면 상태 |
| `app/api/opinions/route.ts` | GET·POST 요청, 검증, 상태 코드 |
| `app/api/opinions/[id]/route.ts` | PATCH·DELETE 요청과 비밀번호 확인 결과 처리 |
| `lib/opinions.ts` | D1의 SELECT·INSERT·UPDATE·DELETE SQL |
| `lib/password.ts` | PBKDF2-SHA-256 비밀번호 해시 생성·검증 |
| `lib/validation.ts` | 입력값 검증 규칙 |
| `lib/types.ts` | API와 화면의 TypeScript 타입 |
| `migrations/0001_create_opinions.sql` | 최초 D1 테이블과 인덱스 |
| `migrations/0002_add_edit_password.sql` | 수정·삭제 인증 정보와 수정 시각 열 추가 |
| `wrangler.jsonc` | Worker, D1, rate limit 바인딩 |

## 원격 D1 및 배포

1. Cloudflare에 로그인합니다.

   ```bash
   pnpm wrangler login
   ```

2. 원격 데이터베이스를 생성합니다.

   ```bash
   pnpm wrangler d1 create campus-opinion-board-db
   ```

3. 출력된 `database_id`를 `wrangler.jsonc`의 자리표시자와 교체합니다. 데이터베이스 ID는 연결 식별자이며 비밀키가 아닙니다.

4. 타입을 갱신하고 원격 마이그레이션을 적용합니다.

   ```bash
   pnpm cf-typegen
   pnpm db:migrate:remote
   ```

5. 빌드하고 Workers에 배포합니다.

   ```bash
   pnpm deploy
   ```

## GitHub 자동 배포

1. 이 폴더를 GitHub 저장소 `campus-opinion-board`에 푸시합니다.
2. Cloudflare Workers & Pages에서 **Import a repository**를 선택합니다.
3. Worker 이름을 `wrangler.jsonc`의 `campus-opinion-board`와 동일하게 설정합니다.
4. 빌드 명령은 `pnpm build`, 배포 명령은 `pnpm wrangler deploy --config dist/server/wrangler.json`으로 설정합니다.
5. `main` 브랜치 푸시 후 빌드 로그와 `workers.dev` 주소를 확인합니다.

D1 마이그레이션은 애플리케이션 배포와 별개입니다. 스키마가 바뀌면 배포 전에 `pnpm db:migrate:remote`를 실행합니다.

`0002_add_edit_password.sql` 적용 전에 등록된 의견에는 비밀번호가 없으므로
목록에서 읽기 전용으로 표시됩니다. 새 의견의 비밀번호는 원문이 아니라 무작위
salt를 사용한 PBKDF2-SHA-256 해시로 저장되며 복구할 수 없습니다.

## 수업 종료 후 쓰기 기능 닫기

`wrangler.jsonc`에서 다음 값을 바꾸고 다시 배포합니다.

```json
"WRITE_ENABLED": "false"
```

목록은 계속 조회할 수 있지만 의견 등록·수정·삭제는 `503` 응답과 안내
메시지로 차단됩니다.

## 강의 시연 순서

1. 의견을 입력하고 등록 버튼을 누릅니다.
2. 브라우저 Network 탭에서 `POST /api/opinions`와 `201` 응답을 확인합니다.
3. `route.ts`에서 서버 검증과 HTTP 상태 코드를 설명합니다.
4. 글을 수정·삭제하면서 `PATCH /api/opinions/{id}`와
   `DELETE /api/opinions/{id}` 응답을 확인합니다.
5. `opinions.ts`에서 `INSERT`, `SELECT`, `UPDATE`, `DELETE`, `prepare()`,
   `bind()`를 확인합니다.
6. D1에서 실제 행이 생성·수정·삭제되는 것을 확인합니다.
7. 새로고침 후 데이터가 유지되는지 확인합니다.
8. 빈 값, 잘못된 비밀번호, 연속 요청으로 오류 응답을 비교합니다.

## 검증 명령

```bash
pnpm typecheck
pnpm build
```
