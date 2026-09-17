export function formatPlayerLabel(input: { nickname: string; seatIndex: number }) {
  return `${input.seatIndex + 1}号 ${input.nickname}`;
}
