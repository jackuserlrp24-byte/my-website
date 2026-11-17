-- Lets the staff panel queue server-wide clean-ups (mass DV, delete NPCs, delete NPC cars). Safe to re-run.
alter table game_actions drop constraint if exists game_actions_action_check;
alter table game_actions add constraint game_actions_action_check
  check (action in ('warn', 'kick', 'ban', 'unban', 'massdv', 'delnpcs', 'delnpcvehicles'));
