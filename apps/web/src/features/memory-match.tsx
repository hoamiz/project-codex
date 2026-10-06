import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  RotateCcw,
  Trophy,
  Timer,
  MousePointer2,
  Sparkles,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import { api, type Page } from '../lib/api';
import { Button, Field, Pagination, State } from '../components/ui';
type Difficulty = 'easy' | 'medium' | 'hard';
interface Saved {
  id: string;
  token: string;
  difficulty: Difficulty;
}
interface Game {
  id: string;
  difficulty: Difficulty;
  cards: { id: string; face?: number; matched: boolean }[];
  moves: number;
  matchedPairs: number;
  totalPairs: number;
  status: 'playing' | 'finished';
  elapsedMs: number;
  version: number;
  cooldownMs: number;
}
interface Rank {
  id: string;
  nickname: string;
  moves: number;
  elapsedMs: number;
}
const levels = { easy: 'Dễ · 6 cặp', medium: 'Vừa · 8 cặp', hard: 'Khó · 12 cặp' };
const faces = ['✦', '◈', '☀', '☾', '✿', '♠', '♥', '♣', '♦', '✧', '▲', '●'];
/** Phiên được lưu chỉ gồm ID/token; dữ liệu cũ/hỏng không làm hỏng trang và deck không nằm trong storage. */
export function readSaved(): Saved | null {
  try {
    const value = JSON.parse(
      sessionStorage.getItem('memory-session') || 'null',
    ) as Partial<Saved> | null;
    return value &&
      typeof value.id === 'string' &&
      typeof value.token === 'string' &&
      value.difficulty &&
      value.difficulty in levels
      ? (value as Saved)
      : null;
  } catch {
    return null;
  }
}
export function duration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
/** Server giữ state; cache chỉ hiển thị phản hồi đã xác nhận, refetch sau conflict và khi hết cooldown. */
export function MemoryMatch() {
  const [session, setSession] = useState<Saved | null>(readSaved);
  const [difficulty, setDifficulty] = useState<Difficulty>(session?.difficulty || 'easy');
  const [now, setNow] = useState(Date.now());
  const received = useRef(Date.now());
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['game', session?.id],
    enabled: !!session,
    retry: false,
    queryFn: async () => {
      const r = await api<{ data: Game }>(`/games/memory/sessions/${session!.id}`, {
        headers: { 'X-Game-Token': session!.token },
      });
      received.current = Date.now();
      return r;
    },
  });
  const game = query.data?.data;
  const start = useMutation({
    mutationFn: () =>
      api<{ data: Game & { token: string } }>('/games/memory/sessions', {
        method: 'POST',
        body: JSON.stringify({ difficulty }),
      }),
    onSuccess: (r) => {
      const saved = { id: r.data.id, token: r.data.token, difficulty: r.data.difficulty };
      received.current = Date.now();
      setSession(saved);
      client.setQueryData(['game', saved.id], { data: r.data });
      try {
        sessionStorage.setItem('memory-session', JSON.stringify(saved));
      } catch {
        /* Không có storage vẫn chơi được trong phiên hiện tại. */
      }
    },
  });
  const flip = useMutation({
    mutationFn: (cardId: string) =>
      api<{ data: Game }>(`/games/memory/sessions/${session!.id}/flips`, {
        method: 'POST',
        headers: { 'X-Game-Token': session!.token },
        body: JSON.stringify({ cardId, version: game!.version }),
      }),
    onSuccess: (r) => {
      received.current = Date.now();
      client.setQueryData(['game', session!.id], r);
    },
    onError: () => {
      void query.refetch();
    },
  });
  /** Timer chỉ phục vụ hiển thị; không bao giờ gửi điểm hoặc thời gian client làm kết quả. */
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 150);
    return () => clearInterval(timer);
  }, []);
  const cooldown = !!game && game.cooldownMs > Math.max(0, now - received.current);
  const elapsed = game
    ? game.elapsedMs + (game.status === 'playing' ? Math.max(0, now - received.current) : 0)
    : 0;
  useEffect(() => {
    if (!game?.cooldownMs) return;
    const timer = setTimeout(() => void query.refetch(), game.cooldownMs + 30);
    return () => clearTimeout(timer);
  }, [game?.version, game?.cooldownMs, query.refetch]);
  return (
    <section className="section game-section">
      <div className="game-heading">
        <div>
          <div className="eyebrow">
            <Sparkles size={13} /> MEMORY MATCH / MỘT THỬ THÁCH NHỎ
          </div>
          <h1>
            Chậm lại.
            <br />
            <span>Nhớ thêm một chút.</span>
          </h1>
          <p>Lật hai thẻ, tìm một cặp. Bạn cần bao nhiêu lượt?</p>
        </div>
        <div className="game-title-art" aria-hidden="true">
          ✦<span>◈</span>
        </div>
      </div>
      <div className="game-layout">
        <div className="game-panel">
          <div className="game-toolbar">
            <select
              aria-label="Độ khó"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            >
              {Object.entries(levels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              disabled={start.isPending}
              onClick={() => {
                flip.reset();
                start.mutate();
              }}
            >
              <RotateCcw size={16} />
              {session ? 'Ván mới' : 'Bắt đầu chơi'}
            </Button>
          </div>
          <div className="game-stats">
            <div>
              <Timer size={16} />
              <strong>{duration(elapsed)}</strong>
              <span>THỜI GIAN</span>
            </div>
            <div>
              <MousePointer2 size={16} />
              <strong>{game?.moves ?? 0}</strong>
              <span>LƯỢT LẬT</span>
            </div>
            <div>
              <Sparkles size={16} />
              <strong>
                {game?.matchedPairs ?? 0}/
                {game?.totalPairs ?? (difficulty === 'easy' ? 6 : difficulty === 'medium' ? 8 : 12)}
              </strong>
              <span>CẶP ĐÃ TÌM</span>
            </div>
          </div>
          {start.error && (
            <p className="notice error-notice" role="alert">
              {start.error.message}
            </p>
          )}
          {query.isError ? (
            <State error={query.error} onRetry={() => void query.refetch()} />
          ) : query.isFetching && !game ? (
            <State loading />
          ) : !game ? (
            <div className="game-start">
              <div aria-hidden="true">✦</div>
              <h2>Sẵn sàng thử trí nhớ?</h2>
              <p>Chọn độ khó và bấm Bắt đầu chơi.</p>
              <Button onClick={() => start.mutate()} disabled={start.isPending}>
                Bắt đầu chơi <ArrowUpRight size={17} />
              </Button>
            </div>
          ) : (
            <>
              <div
                className={`game-board difficulty-${game.difficulty}`}
                aria-label="Bàn chơi Memory Match"
              >
                {game.cards.map((c, i) => (
                  <button
                    key={c.id}
                    className={`memory-card ${c.face !== undefined ? 'revealed' : ''} ${c.matched ? 'matched' : ''}`}
                    aria-label={`Thẻ ${i + 1}${c.face !== undefined ? `, mặt ${faces[c.face]}` : ''}${c.matched ? ', đã ghép' : ''}`}
                    disabled={
                      c.matched ||
                      flip.isPending ||
                      cooldown ||
                      game.status === 'finished' ||
                      c.face !== undefined
                    }
                    onClick={() => flip.mutate(c.id)}
                  >
                    {c.face !== undefined ? (
                      <span>{faces[c.face]}</span>
                    ) : (
                      <span className="card-back">
                        ✧<small>CODEX</small>
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {flip.error && (
                <p role="status" className="notice">
                  {flip.error.message} Bàn chơi đã được đồng bộ.
                </p>
              )}
              {game.status === 'finished' && session && <Result game={game} session={session} />}
            </>
          )}
          <div className="game-instructions">
            <strong>Cách chơi</strong>
            <p>
              Ghép các thẻ giống nhau. Mỗi hai lần lật hợp lệ tính một lượt. Cặp sai đóng sau một
              nhịp; dùng Tab và Enter để chơi bằng bàn phím.
            </p>
          </div>
        </div>
        <Leaderboard difficulty={difficulty} />
      </div>
    </section>
  );
}
function Result({ game, session }: { game: Game; session: Saved }) {
  const [nickname, setNickname] = useState('');
  const client = useQueryClient();
  const submit = useMutation({
    mutationFn: () =>
      api(`/games/memory/sessions/${session.id}/results`, {
        method: 'POST',
        headers: { 'X-Game-Token': session.token },
        body: JSON.stringify({ nickname }),
      }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['leaderboard'] }),
  });
  return (
    <div className="game-result">
      <Trophy size={34} />
      <h2>Bạn đã tìm đủ các cặp!</h2>
      <p>
        {game.moves} lượt · {duration(game.elapsedMs)} · {levels[game.difficulty]}
      </p>
      {submit.isSuccess ? (
        <p className="result-saved">
          <CheckCircle2 size={17} />
          Thành tích đã được lưu.
        </p>
      ) : (
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate();
          }}
        >
          <Field label="Tên trên bảng xếp hạng">
            <input
              required
              minLength={2}
              maxLength={30}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Nickname của bạn"
            />
          </Field>
          {submit.error && (
            <p role="alert" className="error-notice notice">
              {submit.error.message}
            </p>
          )}
          <Button disabled={submit.isPending}>Lưu thành tích</Button>
        </form>
      )}
    </div>
  );
}
function Leaderboard({ difficulty }: { difficulty: Difficulty }) {
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [difficulty]);
  const ranks = useQuery({
    queryKey: ['leaderboard', difficulty, page],
    queryFn: () =>
      api<Page<Rank>>(
        `/games/memory/leaderboard?difficulty=${difficulty}&page=${page}&pageSize=10`,
      ),
  });
  return (
    <aside className="leaderboard">
      <div className="leaderboard-heading">
        <Trophy size={21} />
        <h2>Bảng xếp hạng.</h2>
      </div>
      <span className="badge">{levels[difficulty]}</span>
      <p className="small muted">Ưu tiên ít lượt hơn, sau đó thời gian nhanh hơn.</p>
      {ranks.isPending || ranks.isError ? (
        <State loading={ranks.isPending} error={ranks.error} onRetry={() => void ranks.refetch()} />
      ) : ranks.data?.data.length ? (
        <>
          <ol start={(page - 1) * 10 + 1}>
            {ranks.data.data.map((r, i) => (
              <li key={r.id}>
                <span className="rank-number">
                  {String((page - 1) * 10 + i + 1).padStart(2, '0')}
                </span>
                <div>
                  <strong>{r.nickname}</strong>
                  <small>
                    {r.moves} lượt · {duration(r.elapsedMs)}
                  </small>
                </div>
                {page === 1 && i === 0 && <Trophy size={15} />}
              </li>
            ))}
          </ol>
          <Pagination {...ranks.data.pagination} onChange={setPage} />
        </>
      ) : (
        <div className="rank-empty">
          <Sparkles size={30} />
          <p>
            Chưa có thành tích.
            <br />
            Bạn có thể là người đầu tiên.
          </p>
        </div>
      )}
      <div className="leaderboard-note">
        Kết quả được tính từ phiên chơi và lưu trên PostgreSQL.
      </div>
    </aside>
  );
}
