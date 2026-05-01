# Avalon Helper MVP Implementation Plan

## 1. Product Feature Breakdown

- Room management: host creates room, gets room code, players join with nickname, host locks/unlocks, removes players, and starts a 5-10 player game.
- Game setup: enabled special roles are validated against the standard good/evil distribution before roles are shuffled and assigned.
- Private information: every player receives only their own role, alignment, visible role clues, and currently allowed actions.
- Flow control: server-only state machine controls role viewing, team proposal, team voting, quest submissions, quest resolution, assassination, game over, force progress, and limited rollback.
- Logs: proposals, votes, quests, fail counts, results, assassination, and winner are persisted and exposed as public history without leaking identities.
- Realtime sync: Socket.IO rooms broadcast a state refresh event after state-changing actions; clients fetch their own public/private state.
- Reconnect: playerId/sessionToken are stored client-side and verified server-side before restoring identity.

## 2. Complete State Machine Design

| State | Actions | Permission | Enter | Exit |
| --- | --- | --- | --- | --- |
| LOBBY | join, lock, unlock, remove, start | host for control | room created | start validates roles and assigns identities -> ROLE_ASSIGNED |
| ROLE_ASSIGNED | ack-role, force-progress | player ack, host force | roles assigned | first ack starts ROLE_VIEWING; all ack/host force -> TEAM_PROPOSAL |
| ROLE_VIEWING | ack-role, force-progress | player ack, host force | players can review identity | all ack/host force -> TEAM_PROPOSAL |
| TEAM_PROPOSAL | proposal | current leader | quest is ready for a team | valid team -> TEAM_VOTING |
| TEAM_VOTING | vote, force-progress, rollback | all players vote, host force/rollback | active proposal | approved -> QUEST_SUBMISSION; rejected attempts < 5 -> TEAM_PROPOSAL; rejected attempt 5 -> GAME_OVER evil |
| TEAM_VOTE_RESULT | force-progress | host | optional transition state, skipped by MVP persistence | next phase |
| QUEST_SUBMISSION | quest, force-progress, rollback | team members submit, host force/rollback | proposal approved | all submissions/host force -> QUEST_RESULT |
| QUEST_RESULT | force-progress | host | quest resolved | 3 evil quest wins -> GAME_OVER evil; 3 good quest wins -> ASSASSINATION; otherwise next round TEAM_PROPOSAL |
| ASSASSINATION | assassinate, rollback | assassin only, host rollback | 3 good quest wins | target Merlin -> GAME_OVER evil; otherwise GAME_OVER good |
| GAME_OVER | state/reconnect only | none for flow actions | final winner set | terminal |

Invalid state/action pairs are rejected. After GAME_OVER, all flow actions are rejected.

## 3. Database Table Design

- Room: lifecycle state, code, hostPlayerId, lock flag, round/attempt/leader counters, score, winner, role configuration.
- Player: nickname, seat order, host flag, role/alignment, session token, connection timestamps, role-view acknowledgement.
- Proposal: room/round/attempt, leader, team ids, status, unique active proposal per room/round/attempt.
- TeamVote: one vote per proposal/player.
- Quest: room/round/proposal, team ids, fail count, success.
- QuestSubmission: one submission per quest/player.
- Assassination: one record per room.
- GameStateSnapshot: one latest rollback snapshot per room per rollback source state.

Full Prisma schema is in `prisma/schema.prisma`.

## 4. API Design

All state-changing APIs accept `playerId` and `sessionToken` except room creation/join. Errors are JSON `{ error: { code, message } }`.

- `POST /api/rooms`: `{ nickname }` -> creates room, host player, returns auth payload.
- `POST /api/rooms/[code]/join`: `{ nickname }` -> joins unlocked lobby.
- `POST /api/rooms/[code]/reconnect`: `{ playerId, sessionToken }` -> validates and restores identity.
- `GET /api/rooms/[code]/state?playerId=&sessionToken=` -> `{ publicState, privateView }`.
- `POST /api/rooms/[code]/start`: host only, `{ playerId, sessionToken, enabledRoles }`.
- `POST /api/rooms/[code]/lock`: host only, `{ playerId, sessionToken, isLocked }`.
- `POST /api/rooms/[code]/remove-player`: host only, `{ playerId, sessionToken, targetPlayerId }`.
- `POST /api/rooms/[code]/ack-role`: authenticated player marks role viewed.
- `POST /api/rooms/[code]/proposal`: leader only, `{ teamPlayerIds }`.
- `POST /api/rooms/[code]/vote`: all players, `{ proposalId, vote }`.
- `POST /api/rooms/[code]/quest`: quest member only, `{ questId, result }`.
- `POST /api/rooms/[code]/assassinate`: assassin only, `{ targetPlayerId }`.
- `POST /api/rooms/[code]/rollback`: host only, limited paths.
- `POST /api/rooms/[code]/force-progress`: host only, fills missing votes/submissions or advances role viewing/result.

## 5. Frontend Page Structure

- `/`: mobile-first home with create/join actions.
- `/create`: create room form.
- `/join`: room code and nickname form.
- `/room/[code]`: lobby, player list, start/lock controls.
- `/game/[code]`: state-driven game UI panels: role view, proposal, vote, quest, assassination, result.
- `/result/[code]`: final winner and public history.

The frontend never receives all roles. It displays `PublicGameState` and current `PrivatePlayerView`.

## 6. Project Directory Structure

```text
avalon-helper/
├── app/
├── components/
├── docs/
├── game/
├── lib/
├── prisma/
├── tests/
├── types/
├── server.js
├── package.json
└── tsconfig.json
```
