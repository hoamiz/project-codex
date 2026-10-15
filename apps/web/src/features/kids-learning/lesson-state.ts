import { checkConnection, type MatchRound, type Connection } from './matching-core';
import type { TraceRound, TraceGrade } from './tracing-core';
import type { Point } from './lessons';
export interface MatchingState {
  round: MatchRound;
  connections: Connection[];
  active: number | null;
  message: string;
  revision: number;
}
export type MatchingAction =
  | { type: 'begin'; source: number }
  | { type: 'connect'; source: number; target: number }
  | { type: 'cancel' }
  | { type: 'reset'; round: MatchRound };
export function initialMatching(round: MatchRound): MatchingState {
  return {
    round,
    connections: [],
    active: null,
    message: 'Chọn một số rồi nối tới nhóm hình nhé.',
    revision: 0,
  };
}
/** Giữ các cặp đúng bất biến; chỉ xóa nét sai cùng nguồn khi trẻ bắt đầu một lần thử mới. */
export function matchingReducer(state: MatchingState, action: MatchingAction): MatchingState {
  if (action.type === 'reset') return initialMatching(action.round);
  if (action.type === 'cancel') return { ...state, active: null };
  if (action.type === 'begin') {
    if (
      !state.round.numbers.includes(action.source) ||
      state.connections.some((c) => c.correct && c.source === action.source)
    )
      return state;
    return {
      ...state,
      active: action.source,
      connections: state.connections.filter((c) => c.source !== action.source || c.correct),
    };
  }
  const connection = checkConnection(state.round, state.connections, action.source, action.target);
  if (!connection) return { ...state, active: null };
  const connections = [...state.connections.filter((c) => c.source !== action.source), connection];
  const complete = connections.filter((c) => c.correct).length === state.round.numbers.length;
  return {
    ...state,
    connections,
    active: null,
    revision: state.revision + 1,
    message: complete
      ? 'Hoàn thành rồi! Con giỏi quá!'
      : connection.correct
        ? 'Đúng rồi! Con giỏi quá!'
        : 'Chưa đúng rồi. Con thử lại nhé.',
  };
}

export interface TracingState {
  round: TraceRound;
  phase: 'ready' | 'drawing' | 'retry' | 'animating' | 'completed';
  points: Point[];
  grade: TraceGrade | null;
  sequence: number;
  completedOnce: boolean;
}
export type TracingAction =
  | { type: 'start' }
  | { type: 'cancel' }
  | { type: 'submit'; points: Point[]; grade: TraceGrade }
  | { type: 'animationDone'; roundId: string; sequence: number }
  | { type: 'replay' }
  | { type: 'new'; round: TraceRound };
export function initialTracing(round: TraceRound): TracingState {
  return { round, phase: 'ready', points: [], grade: null, sequence: 0, completedOnce: false };
}
/** Token cả đề/lần thử loại callback cũ; Vẽ lại giữ nguyên đề và cờ từng hoàn thành để không thưởng lặp. */
export function tracingReducer(state: TracingState, action: TracingAction): TracingState {
  if (action.type === 'new') return initialTracing(action.round);
  if (action.type === 'start')
    return state.phase === 'ready' || state.phase === 'retry'
      ? { ...state, phase: 'drawing', points: [], grade: null, sequence: state.sequence + 1 }
      : state;
  if (action.type === 'cancel')
    return state.phase === 'drawing'
      ? { ...state, phase: 'ready', points: [], grade: null }
      : state;
  if (action.type === 'submit')
    return state.phase === 'drawing'
      ? {
          ...state,
          phase: action.grade.accepted ? 'animating' : 'retry',
          points: action.points,
          grade: action.grade,
          completedOnce: state.completedOnce || action.grade.accepted,
        }
      : state;
  if (action.type === 'replay')
    return state.phase === 'completed'
      ? { ...state, phase: 'ready', points: [], grade: null, sequence: state.sequence + 1 }
      : state;
  return state.phase === 'animating' &&
    state.round.id === action.roundId &&
    state.sequence === action.sequence
    ? { ...state, phase: 'completed' }
    : state;
}
