# Command Suite - notes (parked for later)

The Command suite has been put on hold. Nothing was deleted: all the code is still in the project, it is just no longer
what the Services Hub opens. Services Hub -> Metropolitan Police now opens the new white Officer Portal at `/met-police`.

## What was in the Command suite

### Met Police Command Portal  (`/dashboard/command/met-police`)
Code: `app/dashboard/command/met-police/` (`page.tsx`, `MetPoliceClient.tsx`, `BodycamTab.tsx`, `bodycam-actions.ts`)

5 tabs, all behind the Command / management roles:

1. **Officer Search & Dossiers** - search the whitelist by name, collar number, email or Discord ID. Shows the officer's
   avatar, collar number, date of birth, live Discord roles (colour coded, ordered by rank), accepted role additions and their
   training history.
2. **Role Adding Requests** - command submits a request to give one or more officers a role (multi-select with filter,
   role name, reason). Silver / Gold / management approve or deny; every step is logged to the Discord log channel and
   kept as an audit trail. The Discord bot then gives the role.
3. **Training Records & Hosting** - log a training session (course, attendee Discord ID, notes) and browse the history of
   who was trained, by whom.
4. **Department Google Drive** - browse the department folders and slides (folder -> sub-folder -> file) from inside the portal.
5. **Bodycam Footage** - search, play back (clips play back to back), download parts and delete bodycam footage for
   every officer. Footage is auto-deleted after 14 days. The tab now lives on in the officer portal as "Body-Worn Video".

### LAS and LFB Command  (`/dashboard/command/las`, `/dashboard/command/lfb`)
Code: `app/dashboard/command/[dept]/`, `lib/departments.ts`

- Open or close the divisions of that service, set application links and review division applications.
- Control recruitment is shared between both suites.
- Access: Met Gold Command + management, or an optional per-service role
  (`DISCORD_LAS_COMMAND_ROLE_ID` / `DISCORD_LFB_COMMAND_ROLE_ID`).

### Leave of Absence  (`/dashboard/command/loa`)
Code: `app/dashboard/command/loa/`, `lib/loa.ts`
- Submit an LOA; it is checked, authorised or declined and logged for command.

### Command hub  (`/dashboard/command`)
A landing page listing the Met, LAS and LFB command suites (the "Command" button in the portal header).

## Who the roles are
- Command access: management, Gold / Silver / Bronze command and the optional Met Command role (`hasCommandAccess` in `lib/training-config.ts`).
- Approve role requests / view applications: Silver, Gold and management.

## What replaced it (live now): the Officer Portal at `/met-police`
White page with tabs down the left, open to every whitelisted officer:
Incidents, Forms & Paperwork, Announcements, Body-Worn Video, Law Book.
Command and management additionally see every officer's incidents and footage, can post / delete announcements and delete footage.

## Features for later
Ideas to bring back or build on top of the officer portal:

- Officer dossier lookup for command inside the officer portal (the old search tab), with collar number and role history.
- Role requests and training records as a "Command" section that only command sees in the same sidebar.
- Department Google Drive tab (slides and SOPs) for all officers.
- Incident reports written in the portal (not just auto-logged bodycam triggers): narrative, involved parties, outcome, attach a clip.
- Forms submitted inside the portal (instead of external links) with a review / sign-off queue for supervisors.
- Announcement read receipts ("who has read this"), and a Discord post when a new announcement is made.
- Law Book editable from the portal by command (add / edit offences without touching code), with penalties and PACE codes.
- Bodycam: tag clips to an incident, add notes, request a clip be kept past 14 days, access log of who watched a clip.
- Notes / commendations / disciplinary log per officer.
- Rota / duty status (on duty, off duty, LOA) with a live count.
- LAS and LFB versions of the officer portal (same layout, their own forms, announcements and law book).
- Hide or remove the old Command suite completely once everything above has moved over.
